import type { ReactNode } from "react";

type PageSectionHeadingProps = {
  kicker: string;
  children: ReactNode;
  description?: string;
  /** Mặc định h1; đặt false nếu dùng trong vùng đã có h1 */
  as?: "h1" | "h2";
};

/**
 * Tiêu đề lưới sản phẩm / combo — đồng bộ tông trang chủ (kicker đồng, gạch vàng, display).
 */
export default function PageSectionHeading({ kicker, children, description, as = "h1" }: PageSectionHeadingProps) {
  const Tag = as === "h1" ? "h1" : "h2";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#9a7b4f]">{kicker}</p>
      <Tag className="mt-2 font-display text-2xl font-light tracking-wide text-[#1a1d28] sm:text-3xl md:text-4xl">{children}</Tag>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">{description}</p> : null}
      <div className="mt-4 h-px w-16 max-w-full bg-gradient-to-r from-[#c4a35a] to-transparent" />
    </div>
  );
}
