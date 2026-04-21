import type { Product } from "@/features/catalog/types";
import { entityId } from "@/features/catalog/types";

/** Dữ liệu hiển thị thẻ sản phẩm trên trang chủ (chỉ từ API). */
export interface HomeProductCard {
  id: string;
  /** Slug dùng cho URL GET /products/:slug */
  slug: string;
  name: string;
  image: string;
  price: number;
}

function asRecord(p: Product): Record<string, unknown> {
  return p as Record<string, unknown>;
}

function imageFromUnknown(item: unknown): string {
  if (typeof item === "string" && item.trim()) {
    return item.trim();
  }
  if (item && typeof item === "object" && "url" in item && typeof (item as { url: unknown }).url === "string") {
    const u = (item as { url: string }).url.trim();
    return u;
  }
  return "";
}

export function pickPrimaryImageFromRecord(rec: Record<string, unknown>): string {
  const images = rec.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      const direct = imageFromUnknown(item);
      if (direct) {
        return direct;
      }
    }
  }
  const variants = rec.variants;
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") {
        continue;
      }
      const variantImages = (variant as Record<string, unknown>).images;
      if (!Array.isArray(variantImages)) {
        continue;
      }
      for (const item of variantImages) {
        const fromVariant = imageFromUnknown(item);
        if (fromVariant) {
          return fromVariant;
        }
      }
    }
  }
  for (const key of ["image", "thumbnail", "cover_image", "main_image", "photo"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
}

/** Ảnh đại diện cho document Product (trang chi tiết / thẻ). */
export function pickPrimaryImageForProduct(p: Product): string {
  return pickPrimaryImageFromRecord(asRecord(p));
}

function pickPrice(rec: Record<string, unknown>): number {
  const toNum = (v: unknown): number => {
    if (typeof v === "number" && !Number.isNaN(v)) {
      return v;
    }
    if (typeof v === "string") {
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      return Number.isNaN(n) ? NaN : n;
    }
    return NaN;
  };
  for (const key of ["price", "min_price", "base_price", "sale_price", "listed_price"]) {
    const n = toNum(rec[key]);
    if (!Number.isNaN(n) && n >= 0) {
      return n;
    }
  }
  const variants = rec.variants;
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") {
        continue;
      }
      const n = toNum((variant as Record<string, unknown>).price);
      if (!Number.isNaN(n) && n >= 0) {
        return n;
      }
    }
  }
  return 0;
}

/** Ánh xạ 1 document sản phẩm từ GET /products → thẻ storefront. */
export function mapApiProductToHomeCard(p: Product): HomeProductCard | null {
  const rec = asRecord(p);
  const id = entityId(p) || (typeof p.slug === "string" && p.slug.trim() ? p.slug.trim() : "");
  if (!id) {
    return null;
  }
  const slug = typeof p.slug === "string" && p.slug.trim() ? p.slug.trim() : id;
  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Sản phẩm";
  return {
    id,
    slug,
    name,
    image: pickPrimaryImageFromRecord(rec),
    price: pickPrice(rec),
  };
}

export function mapProductListToHomeCards(list: Product[]): HomeProductCard[] {
  return list.map(mapApiProductToHomeCard).filter((x): x is HomeProductCard => x !== null);
}
