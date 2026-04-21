import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { comboPreviewImage } from "@/lib/combo-display";
import { fetchComboBySlug } from "@/services/combo.service";
import { postCartItem } from "@/services/shop.service";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function formatMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

function comboId(combo: Record<string, unknown> | null): string {
  if (!combo) {
    return "";
  }
  const raw = combo._id ?? combo.id;
  return typeof raw === "string" ? raw : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function renderStockType(stockType: string): string {
  if (stockType === "preorder") {
    return "Pre-order";
  }
  if (stockType === "discontinued") {
    return "Ngừng bán";
  }
  return "Sẵn hàng";
}

function stockPillClass(stockType: string): string {
  if (stockType === "preorder") {
    return "bg-amber-100 text-amber-700";
  }
  if (stockType === "discontinued") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

type VariantDetail = {
  productName: string;
  price: number;
  stockQuantity: number;
  stockType: string;
  image: string;
}

function getVariantDetail(
  combo: Record<string, unknown> | null,
  key: "frame_variant_id" | "lens_variant_id"
): VariantDetail {
  const variant = asRecord(combo?.[key]);
  const product = asRecord(variant?.product_id);
  const productImages = Array.isArray(product?.images) ? product.images.filter((v): v is string => typeof v === "string") : [];
  const variantImages = Array.isArray(variant?.images) ? variant.images.filter((v): v is string => typeof v === "string") : [];

  return {
    productName: asString(product?.name),
    price: asNumber(variant?.price),
    stockQuantity: asNumber(variant?.stock_quantity),
    stockType: asString(variant?.stock_type) || "in_stock",
    image: productImages[0] || variantImages[0] || "",
  };
}

export default function ComboDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["combos", "detail", slug],
    enabled: Boolean(slug),
    queryFn: () => fetchComboBySlug(slug as string),
  });

  const combo = useMemo(
    () => (detailQuery.data && typeof detailQuery.data === "object" ? (detailQuery.data as Record<string, unknown>) : null),
    [detailQuery.data]
  );
  const cid = comboId(combo);
  const previewImage = combo ? comboPreviewImage(combo) : "";
  const frameVariant = getVariantDetail(combo, "frame_variant_id");
  const lensVariant = getVariantDetail(combo, "lens_variant_id");
  const totalBefore = frameVariant.price + lensVariant.price;
  const comboPrice = combo ? asNumber(combo.combo_price) : 0;
  const saving = Math.max(0, totalBefore - comboPrice);
  const savingPct = totalBefore > 0 ? Math.round((saving / totalBefore) * 100) : 0;

  const onAdd = async () => {
    if (!cid) {
      toast.error("Không xác định được combo.");
      return;
    }
    if (!token) {
      navigate("/login", { state: { from: `/combos/${slug}` } });
      return;
    }
    setAdding(true);
    try {
      await postCartItem({ combo_id: cid, quantity: Math.max(1, qty), lens_params: {} });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Đã thêm combo vào giỏ hàng.");
      navigate("/cart");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể thêm combo vào giỏ."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 font-sans">
        <Link to="/combos" className="text-sm font-medium text-[#2bb6a3] hover:underline">
          ← Danh sách combo
        </Link>
        {detailQuery.isPending ? (
          <p className="mt-6 text-slate-600">Đang tải combo…</p>
        ) : detailQuery.isError || !combo ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getApiErrorMessage(detailQuery.error, "Không tải được chi tiết combo.")}
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="bg-gradient-to-b from-slate-50 to-white p-5 sm:p-8">
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                    <div className="flex min-h-[280px] items-center justify-center p-6 sm:min-h-[360px]">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={String(combo.name ?? "Combo")}
                          className="h-52 w-full max-w-[440px] object-contain sm:h-72"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">Chưa có ảnh combo</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-5 sm:p-8">
                  <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                    {saving > 0 ? "Tiết kiệm nhiều nhất" : "Combo bán chạy"}
                  </p>
                  <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                    {String(combo.name ?? "Combo gọng + tròng")}
                  </h1>
                  <p className="mt-4 text-[15px] leading-7 text-slate-600">{String(combo.description ?? "Combo gọng + tròng")}</p>

                  <div className="mt-5 rounded-xl border border-[#2bb6a3]/20 bg-[#2bb6a3]/5 p-4">
                    <p className="text-sm font-medium text-slate-600">Giá combo</p>
                    <p className="mt-1 text-3xl font-bold text-[#2bb6a3]">{formatMoney(comboPrice)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                      <span className="text-slate-500 line-through">{formatMoney(totalBefore)}</span>
                      {saving > 0 ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          Tiết kiệm {formatMoney(saving)} ({savingPct}%)
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Giá đã tối ưu</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      { title: "Gọng kính trong combo", data: frameVariant },
                      { title: "Tròng kính trong combo", data: lensVariant },
                    ].map((part) => (
                      <article key={part.title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          {part.data.image ? (
                            <img src={part.data.image} alt={part.data.productName || part.title} className="h-full w-full object-contain" />
                          ) : (
                            <span className="grid h-full place-items-center text-[10px] text-slate-400">Ảnh</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{part.title}</p>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900">
                            {part.data.productName || "Đang cập nhật tên sản phẩm"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-slate-700">{formatMoney(part.data.price)}</span>
                            <span className="text-slate-500">• Tồn {part.data.stockQuantity}</span>
                            <span className={cn("rounded-full px-2 py-0.5 font-semibold", stockPillClass(part.data.stockType))}>
                              {renderStockType(part.data.stockType)}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="inline-flex h-11 items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                      <button
                        type="button"
                        className="h-full w-11 text-lg transition hover:bg-slate-50"
                        onClick={() => setQty((v) => Math.max(1, v - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                        className="h-full w-14 border-x border-slate-300 text-center text-sm outline-none"
                      />
                      <button type="button" className="h-full w-11 text-lg transition hover:bg-slate-50" onClick={() => setQty((v) => v + 1)}>
                        +
                      </button>
                    </div>
                    <Button
                      type="button"
                      className="h-12 w-full rounded-xl bg-[#2bb6a3] px-6 text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#23a796] hover:shadow-lg"
                      disabled={adding}
                      onClick={() => {
                        void onAdd();
                      }}
                    >
                      {adding ? "Đang thêm..." : "Thêm combo vào giỏ"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Vì sao combo này đáng mua?</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Tiết kiệm chi phí</p>
                  <p className="mt-1">Mua trọn bộ với mức giá tốt hơn mua lẻ từng thành phần.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Đã tối ưu sẵn</p>
                  <p className="mt-1">Gọng và tròng được ghép sẵn theo nhu cầu sử dụng phổ biến.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Thêm giỏ nhanh</p>
                  <p className="mt-1">Một chạm để thêm cả combo vào giỏ thay vì chọn từng món.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
