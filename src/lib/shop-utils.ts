import type { ShopVariant } from "@/types/shop";

export function variantMongoId(v: ShopVariant): string {
  return String(v._id ?? v.id ?? "");
}

function parseMoneyField(p: unknown): number | undefined {
  if (typeof p === "number" && !Number.isNaN(p) && p >= 0) {
    return p;
  }
  if (typeof p === "string") {
    const trimmed = p.replace(/\s/g, "");
    const n = Number(
      /^\d+$/.test(trimmed) ? trimmed : trimmed.replace(/\./g, "").replace(",", ".")
    );
    if (!Number.isNaN(n) && n >= 0) {
      return n;
    }
  }
  return undefined;
}

/**
 * Giá bán hiển thị: ưu tiên `price` / `gia_tien` / `unit_price`.
 * Tránh lấy nhầm `sale_price` nhỏ (đôi khi là % hoặc trường phụ) khiến hiển thị vài đồng.
 */
export function variantPrice(v: ShopVariant): number {
  const rec = v as Record<string, unknown>;
  const primary: unknown[] = [v.price, rec.gia_tien, rec.unit_price, rec.base_price, rec.list_price];
  for (const p of primary) {
    const n = parseMoneyField(p);
    if (n != null && n > 0) {
      return n;
    }
  }
  const secondary: unknown[] = [rec.sale_price, rec.final_price, rec.selling_price];
  for (const p of secondary) {
    const n = parseMoneyField(p);
    if (n != null && n >= 1_000) {
      return n;
    }
  }
  for (const p of secondary) {
    const n = parseMoneyField(p);
    if (n != null && n > 0) {
      return n;
    }
  }
  return 0;
}

/** Mô tả ngắn từ attributes (màu, cỡ, …) — không hiển thị _id. */
export function variantAttributesSummary(v: ShopVariant): string {
  const rec = v as Record<string, unknown>;
  const raw = rec.attributes ?? rec.attribute ?? rec.thuoc_tinh ?? rec.variant_attributes;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "";
  }
  const a = raw as Record<string, unknown>;
  const parts: string[] = [];
  const pushStr = (val: unknown) => {
    if (typeof val === "string" && val.trim()) {
      parts.push(val.trim());
    }
  };
  pushStr(a.color ?? a.mau ?? a.màu);
  const sizeVal = a.size ?? a.co ?? a.cỡ;
  if (typeof sizeVal === "string" && sizeVal.trim()) {
    parts.push(`Cỡ ${sizeVal.trim()}`);
  }
  pushStr(a.material ?? a.chat_lieu);
  if (parts.length === 0) {
    for (const val of Object.values(a)) {
      pushStr(val);
    }
  }
  return parts.filter(Boolean).join(" · ");
}

/** SKU ngắn, bỏ qua chuỗi nội bộ dài / chỉ ObjectId. */
export function variantShortSku(v: ShopVariant): string | null {
  if (typeof v.sku !== "string" || !v.sku.trim()) {
    return null;
  }
  let s = v.sku.trim();
  const segs = s.split(/\s*-\s*/).filter(Boolean);
  if (segs.length >= 2) {
    const last = segs[segs.length - 1];
    if (last && last.length <= 36 && !/^[a-f0-9]{24}$/i.test(last)) {
      return last;
    }
  }
  if (/^[a-f0-9]{24}$/i.test(s)) {
    return null;
  }
  if (s.length <= 32) {
    return s;
  }
  return null;
}

/** Nhãn hiển thị cho khách (không dùng Mongo _id). */
export function variantConsumerLabel(v: ShopVariant, index: number): string {
  const fromAttr = variantAttributesSummary(v);
  if (fromAttr) {
    return fromAttr;
  }
  const sku = variantShortSku(v);
  if (sku) {
    return sku;
  }
  return `Phiên bản ${index + 1}`;
}
