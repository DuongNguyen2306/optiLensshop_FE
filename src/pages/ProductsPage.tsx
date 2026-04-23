import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/features/catalog/api";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import { mapProductListToHomeCards } from "@/lib/home-product-map";

function readNum(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function readPagination(raw: unknown, fallbackPage: number, fallbackLimit: number, fallbackRows: number) {
  if (!raw || typeof raw !== "object") {
    return { page: fallbackPage, total_pages: 1, total: fallbackRows };
  }
  const o = raw as Record<string, unknown>;
  const pg = (o.pagination ?? o.meta ?? null) as Record<string, unknown> | null;
  const page = readNum(pg?.page ?? o.page, fallbackPage);
  const limit = readNum(pg?.limit ?? o.limit, fallbackLimit);
  const total = readNum(pg?.total ?? o.total, fallbackRows);
  const totalPages = readNum(pg?.total_pages ?? o.total_pages, Math.max(1, Math.ceil(total / Math.max(1, limit))));
  return {
    page,
    total_pages: totalPages,
    total,
  };
}

function fmtVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function titleByType(type: string): string {
  if (type === "frame") return "Gọng kính";
  if (type === "lens") return "Tròng kính";
  if (type === "sunglasses") return "Kính râm";
  return "Tất cả sản phẩm";
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.max(1, Number(searchParams.get("limit") || 12));
  const type = String(searchParams.get("type") || "").trim();
  const search = String(searchParams.get("search") || "").trim();
  const category = String(searchParams.get("category") || "").trim();
  const categoryId = String(searchParams.get("category_id") || "").trim();

  const productsQuery = useQuery({
    queryKey: ["products", page, limit, type, search, category, categoryId],
    queryFn: () =>
      fetchProducts({
        page,
        limit,
        type: type || undefined,
        search: search || undefined,
        category: category || undefined,
        category_id: categoryId || undefined,
      }),
  });

  const cards = useMemo(() => mapProductListToHomeCards(productsQuery.data?.list ?? []), [productsQuery.data?.list]);
  const pagination = useMemo(
    () => readPagination(productsQuery.data?.raw, page, limit, cards.length),
    [productsQuery.data?.raw, page, limit, cards.length]
  );

  const setPage = (nextPage: number) => {
    const p = new URLSearchParams(searchParams);
    p.set("page", String(nextPage));
    p.set("limit", String(limit));
    setSearchParams(p);
  };

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{titleByType(type)}</h1>
            <p className="text-sm text-slate-500">
              {search ? `Từ khóa: "${search}"` : "Duyệt sản phẩm theo API /products"}
            </p>
          </div>
        </div>

        {productsQuery.isPending ? (
          <p className="text-slate-600">Đang tải sản phẩm…</p>
        ) : productsQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getApiErrorMessage(productsQuery.error, "Không tải được danh sách sản phẩm.")}
          </p>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            Không có sản phẩm phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((p) => (
              <Link
                key={p.id}
                to={`/products/${encodeURIComponent(p.slug)}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#2bb6a3]/40"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-contain p-2" /> : null}
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</p>
                <p className="mt-1 text-sm font-bold text-[#2bb6a3]">{fmtVnd(p.price)}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Tổng: <span className="font-semibold text-slate-900">{pagination.total}</span> sản phẩm
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={pagination.page <= 1 || productsQuery.isFetching}
              onClick={() => setPage(Math.max(1, pagination.page - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={pagination.page >= pagination.total_pages || productsQuery.isFetching}
              onClick={() => setPage(pagination.page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

