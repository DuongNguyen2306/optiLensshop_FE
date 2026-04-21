import { pickPrimaryImageFromRecord } from "@/lib/home-product-map";
import { variantAttributesSummary, variantPrice, variantShortSku } from "@/lib/shop-utils";
import type { ShopVariant } from "@/types/shop";

export function cartRowRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}

export function cartLineImage(row: Record<string, unknown>): string {
  const vObj = cartRowRecord(row.variant_id);
  if (Object.keys(vObj).length > 0) {
    const img = pickPrimaryImageFromRecord(vObj);
    if (img) {
      return img;
    }
  }
  const pObj = cartRowRecord(row.product) ?? cartRowRecord(row.product_id);
  if (Object.keys(pObj).length > 0) {
    const img = pickPrimaryImageFromRecord(pObj);
    if (img) {
      return img;
    }
  }
  return "";
}

export function cartLineProductName(row: Record<string, unknown>): string {
  for (const key of ["product_name", "name", "title"] as const) {
    const x = row[key];
    if (typeof x === "string" && x.trim()) {
      return x.trim();
    }
  }
  const p = cartRowRecord(row.product) ?? cartRowRecord(row.product_id);
  const n = p.name ?? p.title;
  if (typeof n === "string" && n.trim()) {
    return n.trim();
  }
  return "Sản phẩm";
}

export function cartLineVariantLabel(row: Record<string, unknown>): string {
  const v = cartRowRecord(row.variant_id) ?? cartRowRecord(row.variant);
  if (Object.keys(v).length === 0) {
    return "";
  }
  const shopV = v as ShopVariant;
  const fromAttr = variantAttributesSummary(shopV);
  if (fromAttr) {
    return fromAttr;
  }
  return variantShortSku(shopV) ?? "";
}

export function cartLineUnitPrice(row: Record<string, unknown>): number {
  const v = cartRowRecord(row.variant_id) ?? cartRowRecord(row.variant);
  if (Object.keys(v).length > 0) {
    const p = variantPrice(v as ShopVariant);
    if (p > 0) {
      return p;
    }
  }
  for (const key of ["unit_price", "price", "gia_tien", "line_price"] as const) {
    const c = row[key];
    if (typeof c === "number" && !Number.isNaN(c) && c >= 0) {
      return c;
    }
    if (typeof c === "string") {
      const n = Number(String(c).replace(/\s/g, ""));
      if (!Number.isNaN(n) && n >= 0) {
        return n;
      }
    }
  }
  return 0;
}

export function cartLineQuantity(row: Record<string, unknown>): number {
  const q = row.quantity ?? row.qty;
  return typeof q === "number" && q > 0 ? Math.floor(q) : 1;
}

export function formatPriceVnd(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0đ";
  }
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}
