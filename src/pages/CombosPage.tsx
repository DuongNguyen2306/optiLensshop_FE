import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import { comboPreviewImage } from "@/lib/combo-display";
import { fetchCombos } from "@/services/combo.service";

function formatMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

export default function CombosPage() {
  const combosQuery = useQuery({
    queryKey: ["combos", "list"],
    queryFn: () => fetchCombos({ page: 1, limit: 50 }),
  });

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Combo gọng + tròng</h1>
        <p className="mt-2 text-sm text-slate-600">Các combo được tối ưu sẵn cho trải nghiệm mua nhanh.</p>

        {combosQuery.isPending ? (
          <p className="mt-6 text-slate-600">Đang tải combos…</p>
        ) : combosQuery.isError ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getApiErrorMessage(combosQuery.error, "Không tải được danh sách combo.")}
          </p>
        ) : (combosQuery.data?.items.length ?? 0) === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
            Chưa có combo nào.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(combosQuery.data?.items ?? []).map((combo) => {
              const id = String(combo._id ?? combo.id ?? combo.slug ?? "");
              const slug = String(combo.slug ?? "");
              const image = comboPreviewImage(combo);
              return (
                <article key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80">
                    <div className="flex min-h-[180px] items-center justify-center px-4 py-5">
                      {image ? (
                        <img
                          src={image}
                          alt={combo.name ?? "Combo"}
                          className="h-32 w-full max-w-[220px] object-contain"
                        />
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Chưa có ảnh</span>
                      )}
                    </div>
                  </div>
                  <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{combo.name ?? "Combo"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{combo.description ?? "Combo khuyến nghị cho cửa hàng."}</p>
                  <p className="mt-3 text-2xl font-bold text-[#2bb6a3]">{formatMoney(combo.combo_price)}</p>
                  <div className="mt-4">
                    <Link
                      to={`/combos/${encodeURIComponent(slug || id)}`}
                      className="inline-flex rounded-full bg-[#2bb6a3] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
