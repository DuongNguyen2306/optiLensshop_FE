import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Tông cao cấp — đồng / chững (khớp trang chủ) */
const ACCENT = "#9a7b4f";
const ACCENT_SOFT = "rgba(154, 123, 79, 0.2)";
const ACCENT_MID = "rgba(154, 123, 79, 0.4)";

const CATEGORY_ITEMS: { label: string; href: string; icon: "frame" | "lens" | "sun" | "acc"; match: (sp: URLSearchParams) => boolean }[] = [
  { label: "Gọng kính", href: "/products?type=frame", icon: "frame", match: (p) => p.get("type") === "frame" },
  { label: "Tròng kính", href: "/products?type=lens", icon: "lens", match: (p) => p.get("type") === "lens" },
  {
    label: "Kính râm",
    href: "/products?search=kinh%20ram",
    icon: "sun",
    match: (p) => {
      const s = (p.get("search") || "").toLowerCase();
      return s.includes("ram") || s.includes("râm");
    },
  },
  { label: "Phụ kiện", href: "/products?type=accessory", icon: "acc", match: (p) => p.get("type") === "accessory" },
];

function CategoryGlyph({ type, className }: { type: "frame" | "lens" | "sun" | "acc"; className?: string }) {
  const stroke = ACCENT;
  const size = "h-11 w-11 sm:h-12 sm:w-12";
  switch (type) {
    case "frame":
      return (
        <svg className={cn(size, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="7.35" cy="12" r="3.65" fill={ACCENT_SOFT} stroke={stroke} strokeWidth={1.75} />
          <circle cx="16.65" cy="12" r="3.65" fill={ACCENT_SOFT} stroke={stroke} strokeWidth={1.75} />
          <path d="M11.05 12h1.9" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" />
        </svg>
      );
    case "lens":
      return (
        <svg className={cn(size, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="7.25" fill={ACCENT_SOFT} stroke={stroke} strokeWidth={1.75} />
          <circle cx="12" cy="12" r="4" fill={ACCENT_MID} stroke={stroke} strokeWidth={1.35} />
          <circle cx="12" cy="12" r="1.85" fill={ACCENT} />
        </svg>
      );
    case "sun":
      return (
        <svg className={cn(size, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.25" fill={ACCENT_MID} stroke={stroke} strokeWidth={1.65} />
          <path
            d="M12 2.5v2.4M12 19.1v2.4M4.22 4.22l1.7 1.7M18.08 18.08l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.22 19.78l1.7-1.7M18.08 5.92l1.7-1.7"
            stroke={stroke}
            strokeWidth={1.45}
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg className={cn(size, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="5" width="14" height="14" rx="3" fill={ACCENT_SOFT} stroke={stroke} strokeWidth={1.65} />
          <path d="M12 8.25v7.5M8.25 12h7.5" stroke={stroke} strokeWidth={1.85} strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill={ACCENT} opacity={0.45} />
        </svg>
      );
  }
}

/**
 * Lưới danh mục trang chủ — neumorphism + glass; chỉ presentation, liên kết tới /products?...
 */
export default function HomeFeaturedCategories() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  return (
    <section
      className="border-b border-stone-200/40 bg-gradient-to-b from-[#e8e2d8] via-[#f0ebe3] to-[#f7f3ec] py-14"
      aria-label="Danh mục nổi bật"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <p
          className="text-center text-[10px] font-bold uppercase tracking-[0.4em] sm:text-[11px]"
          style={{ color: ACCENT }}
        >
          Danh mục nổi bật
        </p>
        <p className="mt-1 text-center text-sm text-stone-600/90">Khám phá từng dòng sản phẩm</p>
        <div className="mx-auto mt-10 grid max-w-md grid-cols-2 justify-items-center gap-x-6 gap-y-10 sm:max-w-none sm:grid-cols-4 sm:gap-x-8">
          {CATEGORY_ITEMS.map((item, index) => {
            const active = item.match(searchParams);
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "group flex w-full max-w-[9.5rem] flex-col items-center text-center outline-none",
                  "rounded-3xl focus-visible:ring-2 focus-visible:ring-[#9a7b4f]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f1eb]"
                )}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.28, delay: index * 0.08, ease: [0.42, 0, 0.58, 1] }}
                  className={cn(
                    "relative flex h-[7.25rem] w-[7.25rem] shrink-0 items-center justify-center rounded-full sm:h-[7.75rem] sm:w-[7.75rem]",
                    "border border-white/80 bg-gradient-to-br from-white/85 via-white/55 to-stone-100/40",
                    "shadow-[inset_2px_2px_9px_rgba(255,255,255,0.95),inset_-3px_-3px_10px_rgba(120,113,99,0.12),6px_8px_20px_rgba(90,80,70,0.1)]",
                    "backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-in-out will-change-transform",
                    "group-hover:scale-105 group-hover:border-[#9a7b4f]/35",
                    "group-hover:shadow-[inset_1px_1px_6px_rgba(255,255,255,0.9),0_0_0_1px_rgba(154,123,79,0.18),0_12px_32px_rgba(90,70,50,0.12)]",
                    "group-active:scale-[0.98] group-active:duration-200",
                    active && "ring-2 ring-[#9a7b4f]/50 ring-offset-[6px] ring-offset-[#f0ebe3] sm:ring-offset-[8px]"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center transition-[filter,transform] duration-300 ease-in-out",
                      "group-hover:drop-shadow-[0_0_14px_rgba(154,123,79,0.4)] group-hover:animate-home-category-icon-hover"
                    )}
                  >
                    <CategoryGlyph type={item.icon} />
                  </span>
                </motion.div>
                <span
                  className={cn(
                    "mt-3 max-w-[9rem] text-pretty text-sm font-medium leading-snug tracking-wide text-stone-700",
                    "transition-colors duration-300 ease-in-out group-hover:text-[#6d4c41]"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
