import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type ShopShowcaseCardProps = {
  to: string;
  title: string;
  priceText?: string;
  imageUrl?: string | null;
  badge?: string;
  description?: string;
  emptyImageLabel?: string;
  /** Danh sách dạng lưới (trang /products, sản phẩm liên quan) */
  compact?: boolean;
  /** Trang chủ: tông cao cấp (vàng đồng / trung tính), mặc định dùng teal */
  variant?: "default" | "luxe";
  className?: string;
  titleClassName?: string;
  priceClassName?: string;
};

/**
 * Thẻ sản phẩm / combo — chỉ presentation; không chứa logic fetch hay state.
 */
export default function ShopShowcaseCard({
  to,
  title,
  priceText,
  imageUrl,
  badge,
  description,
  emptyImageLabel = "Chưa có ảnh",
  compact = false,
  variant = "default",
  className,
  titleClassName,
  priceClassName,
}: ShopShowcaseCardProps) {
  const isLuxe = variant === "luxe";

  const defaultTitle = compact
    ? "mt-3 line-clamp-2 text-sm font-semibold text-slate-900"
    : "mt-4 line-clamp-2 text-center text-xs font-bold uppercase leading-snug tracking-wide text-slate-900";

  const defaultPrice = compact
    ? isLuxe
      ? "mt-1 text-sm font-bold text-[#6d4c41]"
      : "mt-1 text-sm font-bold text-[#2bb6a3]"
    : isLuxe
      ? "mt-2 text-center text-sm font-bold text-[#6d4c41]"
      : "mt-2 text-center text-sm font-bold text-[#2bb6a3]";

  return (
    <Link
      to={to}
      className={cn(
        "group relative block rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        isLuxe
          ? "hover:-translate-y-1.5 hover:border-[#9a7b4f]/40 hover:shadow-xl hover:shadow-amber-900/10 hover:ring-2 hover:ring-[#9a7b4f]/20"
          : "hover:-translate-y-1.5 hover:border-[#2bb6a3]/40 hover:shadow-xl hover:shadow-[#2bb6a3]/12 hover:ring-2 hover:ring-[#2bb6a3]/20",
        compact ? "p-3 sm:p-3.5" : "p-4",
        isLuxe && "bg-gradient-to-b from-white to-stone-50/90",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          isLuxe ? "from-[#9a7b4f]/[0.08]" : "from-[#2bb6a3]/[0.06]"
        )}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -inset-px z-[1] rounded-2xl opacity-0 blur-[1px] transition-opacity duration-300 group-hover:opacity-100"
        style={
          isLuxe
            ? { background: "linear-gradient(135deg, rgba(154,123,79,0.2), transparent 55%, transparent)" }
            : { background: "linear-gradient(135deg, rgba(43,182,163,0.25), transparent 55%, transparent)" }
        }
        aria-hidden
      />

      <article className="relative z-[2]">
        <div
          className={cn(
            isLuxe
              ? "relative overflow-hidden rounded-xl border border-stone-200/80 bg-gradient-to-b from-stone-100/90 to-stone-50/80"
              : "relative overflow-hidden rounded-xl border border-slate-100/90 bg-gradient-to-b from-slate-50 to-slate-100/70",
            compact
              ? "flex h-36 items-center justify-center"
              : cn(
                  "flex min-h-[160px] items-center justify-center px-3 pb-6 sm:min-h-[180px]",
                  badge ? "pt-10" : "pt-4"
                )
          )}
        >
          {badge ? (
            <p
              className={cn(
                "absolute left-0 right-0 top-3 z-[3] text-center text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                isLuxe ? "text-stone-400 group-hover:text-[#9a7b4f]" : "text-slate-400 group-hover:text-[#2bb6a3]/80"
              )}
            >
              {badge}
            </p>
          ) : null}
          <span
            className="pointer-events-none absolute inset-0 z-[2] translate-x-[-100%] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[100%]"
            aria-hidden
          />
          <div className={cn("relative z-[3] flex w-full items-center justify-center", compact ? "p-2" : "px-3 pb-1 pt-2")}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className={cn(
                  "object-contain transition-transform duration-500 ease-out group-hover:scale-110",
                  compact ? "h-full max-h-[7.5rem] w-full" : "h-32 max-h-36 w-full max-w-[200px]"
                )}
              />
            ) : (
              <span className="text-xs font-medium text-slate-400">{emptyImageLabel}</span>
            )}
          </div>
        </div>

        {description ? (
          <div className={cn(compact ? "mt-2 text-left" : "px-1 pt-3 text-center")}>
            <h4 className={cn(defaultTitle, titleClassName)}>{title}</h4>
            <p className={cn("line-clamp-2 text-slate-500", compact ? "mt-1 text-sm" : "mt-2 text-xs")}>{description}</p>
          </div>
        ) : (
          <h4 className={cn(defaultTitle, titleClassName)}>{title}</h4>
        )}

        {priceText ? <p className={cn(defaultPrice, priceClassName)}>{priceText}</p> : null}
      </article>
    </Link>
  );
}
