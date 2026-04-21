import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { fetchProductDetailBySlug, fetchProducts, fetchProductVariants } from "@/features/catalog/api";
import { entityId } from "@/features/catalog/types";
import { getApiErrorMessage } from "@/lib/api-error";
import { mapProductListToHomeCards, pickPrimaryImageForProduct } from "@/lib/home-product-map";
import { variantConsumerLabel, variantMongoId, variantPrice } from "@/lib/shop-utils";
import { postCartItem } from "@/services/shop.service";
import type { ShopVariant } from "@/types/shop";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";

function formatPriceVnd(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0đ";
  }
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  frame: "Gọng kính",
  lens: "Tròng kính",
  accessory: "Phụ kiện",
};

const COLOR_FALLBACK = ["#2bb6a3", "#111827", "#b8b5c6", "#a3a7b5", "#8b7e6f"];

function imageUrlFromUnknown(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const obj = value as Record<string, unknown>;
  for (const key of ["url", "src", "image", "thumbnail"] as const) {
    const field = obj[key];
    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }
  return "";
}

function collectImagesFromRecord(rec: Record<string, unknown>): string[] {
  const images: string[] = [];
  for (const key of ["images", "gallery", "photos", "thumbnails"] as const) {
    const value = rec[key];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const item of value) {
      const url = imageUrlFromUnknown(item);
      if (url) {
        images.push(url);
      }
    }
  }
  for (const key of ["image", "thumbnail", "cover_image", "main_image", "photo"] as const) {
    const url = imageUrlFromUnknown(rec[key]);
    if (url) {
      images.push(url);
    }
  }
  return images;
}

function extractVariantColor(variant: ShopVariant): string | null {
  const rec = variant as Record<string, unknown>;
  const attrs = rec.attributes;
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) {
    return null;
  }
  const attrRec = attrs as Record<string, unknown>;
  const raw = attrRec.color ?? attrRec.colour ?? attrRec.mau ?? attrRec.màu;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const token = raw.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(token)) {
    return token;
  }
  const map: Record<string, string> = {
    den: "#111827",
    "đen": "#111827",
    black: "#111827",
    trang: "#f8fafc",
    "trắng": "#f8fafc",
    white: "#f8fafc",
    xam: "#9ca3af",
    "xám": "#9ca3af",
    gray: "#9ca3af",
    grey: "#9ca3af",
    xanh: "#2bb6a3",
    blue: "#2bb6a3",
    nau: "#8b5e3c",
    "nâu": "#8b5e3c",
    brown: "#8b5e3c",
    hong: "#ec4899",
    "hồng": "#ec4899",
    pink: "#ec4899",
    bac: "#c4c9d4",
    "bạc": "#c4c9d4",
    silver: "#c4c9d4",
    vang: "#d4af37",
    "vàng": "#d4af37",
    gold: "#d4af37",
  };
  return map[token] ?? null;
}

function BenefitIcon({ type }: { type: "shield" | "pin" | "refresh" | "care" }) {
  const common = "h-5 w-5 text-[#2bb6a3]";
  if (type === "shield") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3.2 7.9-7 10-3.8-2.1-7-5.5-7-10V6l7-3z" />
      </svg>
    );
  }
  if (type === "pin") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6-5.4 6-10a6 6 0 10-12 0c0 4.6 6 10 6 10z" />
        <circle cx="12" cy="11" r="2.2" />
      </svg>
    );
  }
  if (type === "refresh") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0113.7-5.7M20 12a8 8 0 01-13.7 5.7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4h4M3 17v4h4" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["product", "detail", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) {
        throw new Error("Thiếu slug.");
      }
      const detail = await fetchProductDetailBySlug(slug);
      let variants: ShopVariant[] = detail.variants ?? [];
      const pid = entityId(detail.product);
      if (variants.length === 0 && pid) {
        const extra = await fetchProductVariants(pid);
        variants = extra as ShopVariant[];
      }
      return { product: detail.product, variants };
    },
  });

  const product = detailQuery.data?.product;
  const variants = detailQuery.data?.variants ?? [];

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const supportProductsQuery = useQuery({
    queryKey: ["products", "support-lenses", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { list } = await fetchProducts({ page: 1, limit: 20 });
      return mapProductListToHomeCards(list)
        .filter((item) => item.slug !== slug)
        .slice(0, 4);
    },
  });

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantId("");
      return;
    }
    const first = variantMongoId(variants[0]);
    setSelectedVariantId((prev) => {
      if (prev && variants.some((v) => variantMongoId(v) === prev)) {
        return prev;
      }
      return first;
    });
  }, [variants]);

  const heroImage = useMemo(() => {
    if (!product) {
      return "";
    }
    return pickPrimaryImageForProduct(product);
  }, [product]);

  const productImages = useMemo(() => {
    if (!product) {
      return [];
    }
    const rec = product as Record<string, unknown>;
    const list = [heroImage, ...collectImagesFromRecord(rec)];
    for (const variant of variants) {
      list.push(...collectImagesFromRecord(variant as Record<string, unknown>));
    }
    const dedup = Array.from(new Set(list.filter(Boolean)));
    return dedup.slice(0, 6);
  }, [product, variants, heroImage]);

  useEffect(() => {
    if (productImages.length === 0) {
      setSelectedImage("");
      return;
    }
    setSelectedImage((prev) => (prev && productImages.includes(prev) ? prev : productImages[0]));
  }, [productImages]);

  const selectedVariant = useMemo(
    () => variants.find((v) => variantMongoId(v) === selectedVariantId),
    [variants, selectedVariantId]
  );

  const selectedOutOfStock =
    selectedVariant != null &&
    typeof selectedVariant.stock_quantity === "number" &&
    selectedVariant.stock_quantity <= 0;

  const selectedPrice = selectedVariant ? variantPrice(selectedVariant) : 0;

  const productTags = useMemo(() => {
    if (!product) {
      return [];
    }
    const rec = product as Record<string, unknown>;
    const tags: string[] = [];
    const pType = typeof rec.type === "string" ? rec.type.toLowerCase() : "";
    if (pType && PRODUCT_TYPE_LABEL[pType]) {
      tags.push(PRODUCT_TYPE_LABEL[pType]);
    }
    for (const key of ["category", "model", "brand"] as const) {
      const value = rec[key];
      if (typeof value === "string" && value.trim()) {
        tags.push(value.trim());
      }
    }
    return tags.slice(0, 3);
  }, [product]);

  const colorDots = useMemo(() => {
    const palette: string[] = [];
    variants.forEach((variant, index) => {
      const color = extractVariantColor(variant) ?? COLOR_FALLBACK[index % COLOR_FALLBACK.length];
      if (!palette.includes(color)) {
        palette.push(color);
      }
    });
    return palette.slice(0, 5);
  }, [variants]);

  const stockLabel =
    selectedVariant && typeof selectedVariant.stock_quantity === "number"
      ? selectedVariant.stock_quantity > 0
        ? `Còn ${selectedVariant.stock_quantity} sản phẩm`
        : "Tạm hết hàng"
      : "Đang cập nhật tồn kho";

  const addCurrentItemToCart = async (opts?: { showSuccessToast?: boolean }) => {
    const showSuccessToast = opts?.showSuccessToast ?? true;
    if (!selectedVariantId) {
      toast.error("Vui lòng chọn một phiên bản sản phẩm.");
      return false;
    }
    if (!token) {
      toast.info("Vui lòng đăng nhập để thêm giỏ hàng.");
      navigate("/login", { state: { from: `/products/${slug}` } });
      return false;
    }
    try {
      await postCartItem({
        variant_id: selectedVariantId,
        quantity: Math.max(1, quantity),
        lens_params: {},
      });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (showSuccessToast) {
        toast.success("Đã thêm vào giỏ hàng.");
      }
      return true;
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      return false;
    }
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addCurrentItemToCart({ showSuccessToast: true });
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    setBuyingNow(true);
    try {
      const ok = await addCurrentItemToCart({ showSuccessToast: false });
      if (!ok) {
        return;
      }
      navigate("/checkout");
    } finally {
      setBuyingNow(false);
    }
  };

  if (!slug) {
    return <p className="p-8">Thiếu slug sản phẩm.</p>;
  }

  if (detailQuery.isPending) {
    return (
      <div className="min-h-screen bg-white">
        <StoreHeader />
        <p className="mx-auto max-w-4xl px-6 py-16 text-slate-600">Đang tải sản phẩm…</p>
      </div>
    );
  }

  if (detailQuery.isError || !product) {
    return (
      <div className="min-h-screen bg-white">
        <StoreHeader />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-red-600">{getApiErrorMessage(detailQuery.error, "Không tải được sản phẩm.")}</p>
          <Link to="/" className="mt-4 inline-block text-[#2bb6a3] hover:underline">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-[#2bb6a3] hover:underline">
          ← Trang chủ
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="flex min-h-[300px] items-center justify-center border border-slate-200 bg-slate-50 p-6 sm:min-h-[360px]">
              {selectedImage ? (
                <img src={selectedImage} alt={String(product.name)} className="max-h-[460px] w-full object-contain" />
              ) : (
                <span className="text-slate-400">Chưa có ảnh</span>
              )}
            </div>
            {productImages.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {productImages.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-20 border bg-white p-1 transition ${
                      img === selectedImage ? "border-[#2bb6a3]" : "border-slate-200 hover:border-[#2bb6a3]/50"
                    }`}
                    aria-label="Chọn ảnh sản phẩm"
                  >
                    <img src={img} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="lg:pt-1">
            {productTags.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {productTags.map((tag) => (
                  <span key={tag} className="border border-[#2bb6a3]/40 px-2 py-0.5 text-xs text-[#2bb6a3]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <h1 className="text-xl font-bold uppercase leading-snug text-slate-900 sm:text-2xl">
              {String(product.name ?? "Sản phẩm")}
            </h1>
            <p className="mt-3 text-3xl font-bold text-slate-900">{formatPriceVnd(selectedPrice)}</p>
            {colorDots.length > 0 ? (
              <div className="mt-3 flex items-center gap-2">
                {colorDots.map((color) => (
                  <span
                    key={color}
                    className="h-3.5 w-3.5 rounded-full border border-slate-200"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-6">
              {variants.length === 0 ? (
                <p className="text-sm text-amber-800">Hiện chưa có phiên bản để mua. Vui lòng quay lại sau.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {variants.map((v, idx) => {
                    const vid = variantMongoId(v);
                    if (!vid) {
                      return null;
                    }
                    const label = variantConsumerLabel(v, idx);
                    const image = collectImagesFromRecord(v as Record<string, unknown>)[0];
                    return (
                      <label
                        key={vid}
                        className={`cursor-pointer border p-1 transition ${
                          selectedVariantId === vid ? "border-[#2bb6a3]" : "border-slate-200 hover:border-[#2bb6a3]/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="variant"
                          className="sr-only"
                          value={vid}
                          checked={selectedVariantId === vid}
                          onChange={() => setSelectedVariantId(vid)}
                        />
                        <span className="block h-20 w-24 overflow-hidden bg-slate-50">
                          {image ? (
                            <img src={image} alt={label} className="h-full w-full object-contain" />
                          ) : (
                            <span className="grid h-full place-items-center px-2 text-center text-[10px] text-slate-500">{label}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="inline-flex h-10 items-center border border-slate-300">
                <button
                  type="button"
                  className="h-full w-10 text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  aria-label="Giảm số lượng"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="h-full w-12 border-x border-slate-300 text-center text-sm outline-none"
                />
                <button
                  type="button"
                  className="h-full w-10 text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <Button
                type="button"
                className="h-11 min-w-[190px] rounded-none border border-[#2bb6a3] !bg-white px-8 text-sm font-semibold uppercase tracking-wide !text-[#2bb6a3] !shadow-none hover:!bg-[#2bb6a3]/10"
                disabled={adding || buyingNow || variants.length === 0 || selectedOutOfStock}
                onClick={() => void handleAddToCart()}
              >
                {adding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
              </Button>
              {token ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-none border-[#2bb6a3] text-[#2bb6a3]"
                    onClick={() => navigate("/cart")}
                  >
                    Xem giỏ hàng
                  </Button>
                  <Button
                    type="button"
                    className="h-11 rounded-none bg-[#2bb6a3] px-6 uppercase tracking-wide text-white"
                    disabled={adding || buyingNow || variants.length === 0 || selectedOutOfStock}
                    onClick={() => void handleBuyNow()}
                  >
                    {buyingNow ? "Đang xử lý..." : "Đặt hàng"}
                  </Button>
                </>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-between border-y border-slate-200 py-4 text-sm">
              <p className="text-slate-700">{stockLabel}</p>
              <button type="button" className="font-medium text-[#2bb6a3] transition hover:opacity-80">
                Xem chi nhánh còn hàng +
              </button>
            </div>

            <div className="border-b border-slate-200">
              <button type="button" className="flex w-full items-center justify-between py-4 text-left">
                <span className="text-[22px] font-bold text-slate-800">Thông tin chi tiết &amp; mô tả</span>
                <span className="text-xl text-slate-500">+</span>
              </button>
            </div>
            {product.description ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{String(product.description)}</p>
            ) : null}
          </div>
        </div>

        <section className="mt-12 border-y border-[#2bb6a3]/25 py-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { key: "shield", label: "Bảo hành trọn đời", type: "shield" as const },
              { key: "pin", label: "Đo mắt miễn phí", type: "pin" as const },
              { key: "refresh", label: "Thu cũ đổi mới", type: "refresh" as const },
              { key: "care", label: "Vệ sinh và bảo quản kính", type: "care" as const },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 rounded-full border border-slate-200 px-4 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2bb6a3]/10">
                  <BenefitIcon type={item.type} />
                </span>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold uppercase tracking-wide text-slate-900">Tròng kính bổ trợ</h2>
            <Link to="/" className="text-sm font-medium text-[#2bb6a3] hover:underline">
              Xem thêm
            </Link>
          </div>
          {supportProductsQuery.isPending ? (
            <p className="py-6 text-sm text-slate-500">Đang tải sản phẩm bổ trợ...</p>
          ) : supportProductsQuery.data && supportProductsQuery.data.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {supportProductsQuery.data.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${encodeURIComponent(item.slug)}`}
                  className="group border border-slate-200 bg-white p-3 transition hover:border-[#2bb6a3]/50"
                >
                  <div className="h-36 overflow-hidden bg-slate-50">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain transition group-hover:scale-105" />
                    ) : (
                      <span className="grid h-full place-items-center text-xs text-slate-400">Chưa có ảnh</span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold uppercase leading-snug text-slate-900">{item.name}</p>
                  <p className="mt-1 text-lg font-bold text-[#2bb6a3]">{formatPriceVnd(item.price)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-slate-500">Chưa có sản phẩm bổ trợ phù hợp.</p>
          )}
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
