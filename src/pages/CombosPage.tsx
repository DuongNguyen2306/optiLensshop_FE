import { useQuery } from "@tanstack/react-query";
import StoreHeader from "@/components/home/store-header";
import ShopShowcaseCard from "@/components/shop/shop-showcase-card";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import { comboPreviewImage } from "@/lib/combo-display";
import { fetchCombos } from "@/services/combo.service";
import PageSectionHeading from "@/components/layout/page-section-heading";

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
    <div className="min-h-screen bg-[#f4f1eb]">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <PageSectionHeading
          kicker="Gói ưu đãi"
          description="Các combo được tối ưu sẵn gọng + tròng — phù hợp tư vấn nhanh tại cửa hàng và online."
        >
          Combo gọng + tròng
        </PageSectionHeading>

        {combosQuery.isPending ? (
          <p className="mt-8 text-center text-sm font-medium text-stone-500">Đang tải combos…</p>
        ) : combosQuery.isError ? (
          <p className="mt-8 rounded-lg border border-red-200/80 bg-red-50 p-4 text-sm text-red-800">
            {getApiErrorMessage(combosQuery.error, "Không tải được danh sách combo.")}
          </p>
        ) : (combosQuery.data?.items.length ?? 0) === 0 ? (
          <div className="mt-8 rounded-sm border border-dashed border-stone-300/80 bg-stone-50/80 p-10 text-center text-sm text-stone-600">
            Chưa có combo nào.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(combosQuery.data?.items ?? []).map((combo) => {
              const id = String(combo._id ?? combo.id ?? combo.slug ?? "");
              const slug = String(combo.slug ?? "");
              const image = comboPreviewImage(combo);
              return (
                <ShopShowcaseCard
                  key={id}
                  variant="luxe"
                  to={`/combos/${encodeURIComponent(slug || id)}`}
                  title={combo.name ?? "Combo"}
                  priceText={formatMoney(combo.combo_price)}
                  imageUrl={image}
                  description={combo.description ?? "Combo khuyến nghị cho cửa hàng."}
                  titleClassName="mt-3 line-clamp-2 text-lg font-semibold text-stone-800"
                  priceClassName="mt-3 text-2xl font-bold text-[#6d4c41]"
                />
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
