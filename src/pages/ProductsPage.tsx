import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/features/catalog/api";
import ShopShowcaseCard from "@/components/shop/shop-showcase-card";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import PageSectionHeading from "@/components/layout/page-section-heading";
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

/** Tiêu đề hiển thị theo bộ lọc URL (không đổi API). */
function getListTitle(type: string, search: string): string {
  const s = search.trim().toLowerCase();
  if (s && (s.includes("ram") || s.includes("râm"))) {
    return "Kính râm";
  }
  if (type === "frame") {
    return "Gọng kính";
  }
  if (type === "lens") {
    return "Tròng kính";
  }
  if (type === "sunglasses") {
    return "Kính râm";
  }
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

  const listTitle = getListTitle(type, search);
  const listDescription =
    search
      ? `Kết quả tìm theo: "${search}". Dữ liệu từ API sản phẩm.`
      : "";

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <PageSectionHeading kicker="Cửa hàng online" description={listDescription}>
          {listTitle}
        </PageSectionHeading>

        {productsQuery.isPending ? (
          <p className="mt-8 text-center text-sm font-medium text-stone-500">Đang tải sản phẩm…</p>
        ) : productsQuery.isError ? (
          <p className="mt-8 rounded-lg border border-red-200/80 bg-red-50 p-4 text-sm text-red-800">
            {getApiErrorMessage(productsQuery.error, "Không tải được danh sách sản phẩm.")}
          </p>
        ) : cards.length === 0 ? (
          <div className="mt-8 rounded-sm border border-dashed border-stone-300/80 bg-stone-50/80 p-10 text-center text-sm text-stone-600 backdrop-blur-sm">
            Không có sản phẩm phù hợp.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((p) => (
              <ShopShowcaseCard
                key={p.id}
                variant="luxe"
                to={`/products/${encodeURIComponent(p.slug)}`}
                title={p.name}
                priceText={fmtVnd(p.price)}
                imageUrl={p.image}
                compact
              />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4 border-t border-stone-200/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-600">
            Tổng: <span className="font-semibold text-[#1a1d28]">{pagination.total}</span> sản phẩm
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-w-[5.5rem] border border-stone-300/90 bg-white/90 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition duration-300 ease-in-out hover:border-[#2BBBAD]/45 hover:text-[#2BBBAD] disabled:opacity-45"
              disabled={pagination.page <= 1 || productsQuery.isFetching}
              onClick={() => setPage(Math.max(1, pagination.page - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              className="min-w-[5.5rem] border border-stone-300/90 bg-white/90 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition duration-300 ease-in-out hover:border-[#2BBBAD]/45 hover:text-[#2BBBAD] disabled:opacity-45"
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

