import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "@/features/catalog/api";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import type { HomeProductCard } from "@/lib/home-product-map";
import { mapProductListToHomeCards } from "@/lib/home-product-map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Banner tách trái ảnh / phải nội dung nền beige — đúng layout mẫu Anna. */
const HERO_MODEL =
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80";
/** Banner giữa trang — file `public/images/banner2.jpg`. */
const MID_BANNER = "/images/banner2.jpg";

const CATEGORY_ITEMS: { label: string; href: string; icon: "frame" | "lens" | "sun" | "acc" }[] = [
  { label: "Gọng kính", href: "#", icon: "frame" },
  { label: "Tròng kính", href: "#", icon: "lens" },
  { label: "Kính râm", href: "#", icon: "sun" },
  { label: "Phụ kiện", href: "#", icon: "acc" },
];

function CategoryIcon({ type }: { type: "frame" | "lens" | "sun" | "acc" }) {
  const common = "h-7 w-7 text-[#2bb6a3]";
  switch (type) {
    case "frame":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3zM7 12c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3z"
          />
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      );
    case "lens":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2.25" />
        </svg>
      );
    case "sun":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z"
          />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
      );
  }
}

function formatPriceVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function SectionLinks({ className }: { className?: string }) {
  const links = ["Gọng kính", "Tròng kính", "Kính râm", "Xem tất cả →"];
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs font-medium text-slate-600", className)}>
      {links.map((label) => (
        <a key={label} href="#" className="transition hover:text-[#2bb6a3]">
          {label}
        </a>
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: HomeProductCard }) {
  return (
    <Link
      to={`/products/${encodeURIComponent(product.slug)}`}
      className={cn(
        "group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300",
        "hover:border-[#2bb6a3]/25 hover:bg-teal-50 hover:shadow-md"
      )}
    >
      <article>
      <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80">
        <p className="absolute left-0 right-0 top-3 z-[1] text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          anna eyewear
        </p>
        <div className="flex min-h-[160px] items-center justify-center px-3 pb-6 pt-10 sm:min-h-[180px]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-32 max-h-36 w-full max-w-[200px] object-contain transition duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <span className="text-xs font-medium text-slate-400">Chưa có ảnh</span>
          )}
        </div>
      </div>
      <h4 className="mt-4 line-clamp-2 text-center text-xs font-bold uppercase leading-snug tracking-wide text-slate-900">
        {product.name}
      </h4>
      <p className="mt-2 text-center text-sm font-bold text-[#2bb6a3]">{formatPriceVnd(product.price)}</p>
      </article>
    </Link>
  );
}

export default function HomePage() {
  const [bestProducts, setBestProducts] = useState<HomeProductCard[]>([]);
  const [newProducts, setNewProducts] = useState<HomeProductCard[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <div className="flex items-center justify-center gap-8 bg-[#2bb6a3] px-6 py-3 text-center text-xs font-semibold uppercase tracking-widest text-white">
        <button type="button" className="opacity-90 transition hover:opacity-100" aria-label="Trước">
          ‹
        </button>
        <span>Thu cũ đổi mới</span>
        <button type="button" className="opacity-90 transition hover:opacity-100" aria-label="Sau">
          ›
        </button>
      </div>

      <StoreHeader />

      {/* Hero — bản mẫu: 50/50 ảnh model + cột beige, headline serif */}
      <section className="relative min-h-[420px] overflow-hidden bg-[#d4c4b0] lg:min-h-[480px]">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-2">
          <div className="relative min-h-[280px] lg:min-h-[480px]">
            <img
              src={HERO_MODEL}
              alt="Anna Eyewear — Chào hè rực rỡ"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent lg:hidden" aria-hidden />
          </div>
          <div className="relative flex flex-col justify-center px-6 py-12 lg:px-12">
            <div className="absolute inset-0 hidden bg-[#d4c4b0] lg:block" aria-hidden />
            <div className="relative z-10 max-w-lg text-white lg:text-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90 lg:text-slate-600">
                Deal xinh lung linh
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold capitalize leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-slate-900 lg:drop-shadow-none">
                Chào hè rực rỡ
              </h1>
              <p className="mt-3 text-sm text-white/90 lg:text-slate-600">15.04 — 10.05</p>
            </div>
            <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Gọng kính 1K", d: "Áp dụng khi cắt từ tròng kính Kochi" },
                { t: "Thu cũ đổi mới", d: "-800K Không điều kiện" },
                { t: "Kính râm sale", d: "Lên đến 49%" },
              ].map((box) => (
                <div
                  key={box.t}
                  className="rounded-lg border border-white/30 bg-white/15 p-3 text-left text-xs text-white backdrop-blur-sm lg:border-slate-200/80 lg:bg-white/90 lg:text-slate-800 lg:backdrop-blur-none"
                >
                  <p className="font-bold uppercase leading-snug tracking-wide">{box.t}</p>
                  <p className="mt-1 text-[11px] opacity-90 lg:opacity-80">{box.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Danh mục — icon trong vòng tròn, căn giữa */}
      <section className="border-b border-slate-100 bg-slate-50/60 py-12">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Danh mục nổi bật</h2>
          <div className="mt-8 flex flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-10">
            {CATEGORY_ITEMS.map((cat) => (
              <a
                key={cat.label}
                href={cat.href}
                className="group flex w-[88px] flex-col items-center text-center sm:w-[100px]"
              >
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-sm transition duration-300 group-hover:border-[#2bb6a3]/50 group-hover:shadow-md sm:h-24 sm:w-24">
                  <span className="flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11">
                    <CategoryIcon type={cat.icon} />
                  </span>
                </span>
                <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-700 transition group-hover:text-[#2bb6a3]">
                  {cat.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-lg font-bold uppercase tracking-[0.28em] text-[#2bb6a3] sm:text-left">Best seller</h3>
          <SectionLinks />
        </div>

        {loadingProducts ? (
          <p className="py-12 text-center text-sm font-medium text-slate-500">Đang tải sản phẩm…</p>
        ) : productsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 py-8 text-center text-sm text-red-700">{productsError}</p>
        ) : bestProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có sản phẩm.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {bestProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            className="h-11 rounded-full border-2 border-[#2bb6a3] px-10 text-sm font-semibold text-[#2bb6a3] transition hover:bg-[#2bb6a3]/10"
          >
            Xem toàn bộ sản phẩm
          </Button>
        </div>
      </section>

      <div className="w-full">
        <img
          src={MID_BANNER}
          alt="Bộ sưu tập Anna Eyewear"
          className="h-52 w-full object-cover sm:h-64 md:h-80 lg:h-96"
        />
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-lg font-bold uppercase tracking-[0.22em] text-[#2bb6a3] sm:text-left">Sản phẩm mới</h3>
          <SectionLinks />
        </div>
        {loadingProducts ? (
          <p className="py-12 text-center text-sm font-medium text-slate-500">Đang tải sản phẩm…</p>
        ) : productsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 py-8 text-center text-sm text-red-700">{productsError}</p>
        ) : newProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có sản phẩm.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {newProducts.map((p) => (
              <ProductCard key={`new-${p.id}`} product={p} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
