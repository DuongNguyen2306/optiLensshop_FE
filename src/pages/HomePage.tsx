import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "@/features/catalog/api";
import { fetchCombos } from "@/services/combo.service";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import type { HomeProductCard } from "@/lib/home-product-map";
import { mapProductListToHomeCards } from "@/lib/home-product-map";
import ShopShowcaseCard from "@/components/shop/shop-showcase-card";
import HomeFeaturedCategories from "@/components/home/home-featured-categories";
import { cn } from "@/lib/utils";
import type { Combo } from "@/types/combo";
import { comboPreviewImage } from "@/lib/combo-display";

/** Banner tách trái ảnh / phải nội dung nền beige — đúng layout mẫu MYLENS. */
const HERO_MODEL =
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80";
/** Banner giữa trang — file `public/images/banner2.jpg`. */
const MID_BANNER = "/images/banner2.jpg";

function formatPriceVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function SectionTitle({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#9a7b4f]">{kicker}</p>
      <h2 className="mt-2 font-display text-2xl font-light tracking-wide text-[#1a1d28] sm:text-3xl">{children}</h2>
      <div className="mt-4 h-px w-16 max-w-full bg-gradient-to-r from-[#c4a35a] to-transparent" />
    </div>
  );
}

function SectionLinks({ className }: { className?: string }) {
  const links = [
    { label: "Gọng kính", to: "/products?type=frame" },
    { label: "Tròng kính", to: "/products?type=lens" },
    { label: "Kính râm", to: "/products?search=kinh%20ram" },
    { label: "Xem tất cả →", to: "/products" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs font-medium tracking-wide text-stone-600", className)}>
      {links.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="transition duration-200 ease-in-out hover:text-[#6d4c41] hover:underline decoration-[#c4a35a] underline-offset-4"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [bestProducts, setBestProducts] = useState<HomeProductCard[]>([]);
  const [newProducts, setNewProducts] = useState<HomeProductCard[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [comboProducts, setComboProducts] = useState<Combo[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [combosError, setCombosError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingProducts(true);
      setProductsError(null);
      try {
        const [page1, page2] = await Promise.all([
          fetchProducts({ page: 1, limit: 8 }),
          fetchProducts({ page: 2, limit: 8 }),
        ]);
        if (cancelled) {
          return;
        }
        setBestProducts(mapProductListToHomeCards(page1.list));
        const newest = page2.list.length > 0 ? page2.list : page1.list;
        setNewProducts(mapProductListToHomeCards(newest));
      } catch (e) {
        if (!cancelled) {
          setProductsError(getApiErrorMessage(e, "Không tải được sản phẩm."));
          setBestProducts([]);
          setNewProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCombos = async () => {
      setLoadingCombos(true);
      setCombosError(null);
      try {
        const res = await fetchCombos({ page: 1, limit: 8, is_active: true });
        if (cancelled) {
          return;
        }
        setComboProducts(res.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setCombosError(getApiErrorMessage(e, "Không tải được danh sách combo."));
          setComboProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCombos(false);
        }
      }
    };
    void loadCombos();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f1eb] font-sans text-stone-900">
      <div className="flex items-center justify-center gap-6 border-b border-[#c4a35a]/20 bg-gradient-to-r from-[#0f1218] via-[#1a1f2e] to-[#0f1218] px-6 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-[#d4c4a8] sm:gap-10 sm:py-3">
        <button type="button" className="text-[#8a7a6a] transition hover:text-[#c4a35a]" aria-label="Trước">
          ‹
        </button>
        <span>Thu cũ đổi mới · ưu đãi tại cửa hàng</span>
        <button type="button" className="text-[#8a7a6a] transition hover:text-[#c4a35a]" aria-label="Sau">
          ›
        </button>
      </div>

      <StoreHeader />

      <section className="relative min-h-[440px] overflow-hidden bg-[#0f1218] lg:min-h-[520px]">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-2">
          <div className="group relative min-h-[300px] overflow-hidden transition-shadow duration-500 ease-out hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] lg:min-h-[520px] lg:hover:ring-1 lg:hover:ring-inset lg:hover:ring-white/12">
            <img
              src={HERO_MODEL}
              alt="MYLENS — Bộ sưu tập mới"
              className="absolute inset-0 z-0 h-full w-full object-cover object-center will-change-transform brightness-[0.92] contrast-[1.03] saturate-[1.02] transition-[transform,filter,box-shadow] duration-[1.1s] ease-out motion-reduce:transition-none group-hover:scale-105 group-hover:brightness-100 group-hover:contrast-[1.04] group-hover:duration-1000 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:brightness-[0.92] md:group-hover:scale-[1.04]"
            />
            <div
              className="absolute inset-0 z-[1] bg-gradient-to-r from-[#0a0c10]/80 via-[#0a0c10]/25 to-transparent transition-opacity duration-700 ease-out group-hover:from-[#0a0c10]/60 group-hover:via-[#0a0c10]/20 lg:from-[#0f1218]/50 group-hover:lg:from-[#0f1218]/35"
              aria-hidden
            />
            <div
              className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0f1218]/50 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-65 lg:opacity-100 group-hover:lg:opacity-75"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-[#c4a35a]/0 via-transparent to-[#0f1218]/0 opacity-0 transition duration-1000 group-hover:opacity-100 group-hover:from-[#c4a35a]/[0.05] group-hover:via-transparent group-hover:to-[#0a0c10]/0"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 z-[1] h-20 bg-gradient-to-t from-[#0f1218] to-transparent lg:hidden" aria-hidden />
          </div>
          <div className="relative flex flex-col justify-center px-6 py-14 lg:min-h-[520px] lg:px-12 lg:py-16">
            <div
              className="absolute inset-0 hidden bg-gradient-to-br from-[#1a1f2e] via-[#12171f] to-[#0a0d12] lg:block"
              aria-hidden
            />
            <div className="relative z-10 max-w-lg text-stone-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#c4a35a]">Tinh tế · Bền vững</p>
              <h1 className="mt-4 font-display text-4xl font-light leading-[1.15] tracking-tight sm:text-5xl lg:text-[2.75rem]">
                Kính mắt
                <span className="mt-1 block text-stone-300/95">cao cấp cho bạn</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-stone-400">
                Cân bằng thẩm mỹ &amp; trải nghiệm đeo — lựa chọn gọng, tròng và dịch vụ cá nhân hóa tại MYLENS.
              </p>
            </div>
            <div className="relative z-10 mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Gọng ngoại nhập", d: "Cận chính hãng, cắt cạnh" },
                { t: "Tròng chống ánh sáng xanh", d: "Theo công nghệ Zeiss" },
                { t: "Thu cũ đổi mới", d: "Lên tới 800.000đ" },
              ].map((box) => (
                <div
                  key={box.t}
                  className="rounded-sm border border-[#c4a35a]/20 bg-white/[0.04] p-3.5 text-left text-xs text-stone-200 backdrop-blur-sm transition duration-200 hover:border-[#c4a35a]/35"
                >
                  <p className="font-semibold uppercase tracking-wide text-[#c4a35a]">{box.t}</p>
                  <p className="mt-1.5 text-[11px] leading-snug text-stone-400">{box.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeFeaturedCategories />

      <section className="border-t border-stone-200/30 bg-gradient-to-b from-[#f7f4ed] to-[#f0ebe0]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle kicker="Bộ sưu tập">Bán chạy nhất</SectionTitle>
          <SectionLinks />
        </div>

        {loadingProducts ? (
          <p className="py-12 text-center text-sm font-medium text-stone-500">Đang tải sản phẩm…</p>
        ) : productsError ? (
          <p className="rounded-lg border border-red-200/80 bg-red-50 py-8 text-center text-sm text-red-800">{productsError}</p>
        ) : bestProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">Chưa có sản phẩm.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {bestProducts.map((p) => (
              <ShopShowcaseCard
                key={p.id}
                variant="luxe"
                to={`/products/${encodeURIComponent(p.slug)}`}
                title={p.name}
                priceText={formatPriceVnd(p.price)}
                imageUrl={p.image}
                badge="MYLENS"
              />
            ))}
          </div>
        )}

        <div className="mt-14 flex justify-center">
          <Link
            to="/products"
            className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-none border border-[#9a7b4f] bg-transparent px-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1d28] shadow-sm transition duration-300 ease-in-out hover:bg-[#9a7b4f]/[0.12] hover:shadow-md"
          >
            Xem toàn bộ sản phẩm
          </Link>
        </div>
        </div>
      </section>

      <div className="relative w-full overflow-hidden">
        <img
          src={MID_BANNER}
          alt="Bộ sưu tập MYLENS"
          className="h-52 w-full object-cover sm:h-64 md:h-80 lg:h-96"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1d28]/30 via-transparent to-[#0f1218]/15"
          aria-hidden
        />
      </div>

      <section className="bg-[#faf8f4]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle kicker="Gói ưu đãi">Combo nổi bật</SectionTitle>
          <Link
            to="/combos"
            className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600 transition hover:text-[#6d4c41]"
          >
            Xem tất cả →
          </Link>
        </div>
        {loadingCombos ? (
          <p className="py-12 text-center text-sm font-medium text-stone-500">Đang tải combo…</p>
        ) : combosError ? (
          <p className="rounded-lg border border-red-200/80 bg-red-50 py-8 text-center text-sm text-red-800">{combosError}</p>
        ) : comboProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">Chưa có combo.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {comboProducts.map((c) => {
              const id = String(c._id ?? c.id ?? "");
              const slug = String(c.slug ?? "");
              const link = `/combos/${encodeURIComponent(slug || id)}`;
              const price = typeof c.combo_price === "number" ? c.combo_price : 0;
              const image = comboPreviewImage(c);
              return (
                <ShopShowcaseCard
                  key={String(c._id ?? c.id ?? c.slug)}
                  variant="luxe"
                  to={link}
                  title={c.name ?? "Combo"}
                  priceText={formatPriceVnd(price)}
                  imageUrl={image}
                  badge="COMBO"
                  description={c.description ?? "Gọng + tròng tối ưu cho nhu cầu sử dụng."}
                  titleClassName="mt-3 line-clamp-2 text-sm font-semibold uppercase leading-snug tracking-wide text-stone-800"
                  priceClassName="mt-3 text-center text-sm font-bold text-[#6d4c41]"
                />
              );
            })}
          </div>
        )}
        </div>
      </section>

      <section className="border-t border-stone-200/40 bg-[#f4f1eb]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle kicker="Cập nhật">Hàng mới về</SectionTitle>
          <SectionLinks />
        </div>
        {loadingProducts ? (
          <p className="py-12 text-center text-sm font-medium text-stone-500">Đang tải sản phẩm…</p>
        ) : productsError ? (
          <p className="rounded-lg border border-red-200/80 bg-red-50 py-8 text-center text-sm text-red-800">{productsError}</p>
        ) : newProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">Chưa có sản phẩm.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {newProducts.map((p) => (
              <ShopShowcaseCard
                key={`new-${p.id}`}
                variant="luxe"
                to={`/products/${encodeURIComponent(p.slug)}`}
                title={p.name}
                priceText={formatPriceVnd(p.price)}
                imageUrl={p.image}
                badge="NEW"
              />
            ))}
          </div>
        )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
