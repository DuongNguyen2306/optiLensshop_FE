import { pickPrimaryImageFromRecord } from "@/lib/home-product-map";
import { variantAttributesSummary, variantPrice, variantShortSku } from "@/lib/shop-utils";
import type { ShopVariant } from "@/types/shop";

export function cartRowRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}

function firstNonEmptyRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const rec = cartRowRecord(value);
    if (Object.keys(rec).length > 0) {
      return rec;
    }
  }
  return {};
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readFirstImage(record: Record<string, unknown>): string {
  const fromPicker = pickPrimaryImageFromRecord(record);
  if (fromPicker) {
    return fromPicker;
  }
  const images = record.images;
  if (Array.isArray(images)) {
    const first = images.find((img): img is string => typeof img === "string" && img.trim().length > 0);
    if (first) {
      return first;
    }
  }
  return "";
}

function readStringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function comboObject(row: Record<string, unknown>): Record<string, unknown> {
  return cartRowRecord(row.combo_id);
}

function variantObject(row: Record<string, unknown>): Record<string, unknown> {
  return firstNonEmptyRecord(row.variant_id, row.variant);
}

function productFromVariant(variant: Record<string, unknown>): Record<string, unknown> {
  return firstNonEmptyRecord(variant.product_id, variant.product);
}

export function isComboItem(row: Record<string, unknown>): boolean {
  if (typeof row.combo_id === "string" && row.combo_id.trim()) {
    return true;
  }
  const cObj = comboObject(row);
  return Object.keys(cObj).length > 0;
}

export function getCartItemUnitPrice(row: Record<string, unknown>): number {
  if (isComboItem(row)) {
    const comboSnapshot = parseNumber(row.combo_price_snapshot);
    if (comboSnapshot != null && comboSnapshot >= 0) {
      return comboSnapshot;
    }
    const combo = comboObject(row);
    const comboPrice = parseNumber(combo.combo_price);
    if (comboPrice != null && comboPrice >= 0) {
      return comboPrice;
    }
    for (const key of ["unit_price", "price", "line_price", "gia_tien"] as const) {
      const fallback = parseNumber(row[key]);
      if (fallback != null && fallback >= 0) {
        return fallback;
      }
    }
    return 0;
  }

  const variantSnapshot = parseNumber(row.price_snapshot);
  if (variantSnapshot != null && variantSnapshot >= 0) {
    return variantSnapshot;
  }
  const variant = variantObject(row);
  if (Object.keys(variant).length > 0) {
    const p = variantPrice(variant as ShopVariant);
    if (p > 0) {
      return p;
    }
  }
  for (const key of ["unit_price", "price", "line_price", "gia_tien"] as const) {
    const fallback = parseNumber(row[key]);
    if (fallback != null && fallback >= 0) {
      return fallback;
    }
  }
  return 0;
}

export function isCartItemMissingPriceData(row: Record<string, unknown>): boolean {
  if (!isComboItem(row)) {
    return false;
  }
  const hasSnapshot = parseNumber(row.combo_price_snapshot) != null;
  if (hasSnapshot) {
    return false;
  }
  const combo = comboObject(row);
  const hasComboPrice = parseNumber(combo.combo_price) != null;
  return !hasComboPrice;
}

export function getCartItemDisplayName(row: Record<string, unknown>): string {
  if (isComboItem(row)) {
    const combo = comboObject(row);
    const comboName = readStringField(combo, ["name", "title"]);
    if (comboName) {
      return comboName;
    }
    const frameVariant = cartRowRecord(combo.frame_variant_id);
    const lensVariant = cartRowRecord(combo.lens_variant_id);
    const frameProduct = productFromVariant(frameVariant);
    const lensProduct = productFromVariant(lensVariant);
    const frameName = readStringField(frameProduct, ["name", "title"]);
    const lensName = readStringField(lensProduct, ["name", "title"]);
    if (frameName && lensName) {
      return `${frameName} + ${lensName}`;
    }
    if (frameName || lensName) {
      return frameName || lensName;
    }
    return "Combo";
  }

  for (const key of ["product_name", "name", "title"] as const) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const variant = variantObject(row);
  const variantProduct = productFromVariant(variant);
  const variantName = readStringField(variantProduct, ["name", "title"]);
  if (variantName) {
    return variantName;
  }
  const p = firstNonEmptyRecord(row.product, row.product_id);
  const productName = readStringField(p, ["name", "title"]);
  if (productName) {
    return productName;
  }
  return "Sản phẩm";
}

export function getCartItemImage(row: Record<string, unknown>): string {
  if (isComboItem(row)) {
    const combo = comboObject(row);
    const frameVariant = cartRowRecord(combo.frame_variant_id);
    const lensVariant = cartRowRecord(combo.lens_variant_id);
    const frameProduct = productFromVariant(frameVariant);
    const lensProduct = productFromVariant(lensVariant);
    const preferred = [
      readFirstImage(frameProduct),
      readFirstImage(lensProduct),
      readFirstImage(frameVariant),
      readFirstImage(lensVariant),
      readFirstImage(combo),
    ].find((img) => Boolean(img));
    return preferred ?? "";
  }

  const variant = variantObject(row);
  if (Object.keys(variant).length > 0) {
    const variantImage = readFirstImage(variant);
    if (variantImage) {
      return variantImage;
    }
    const product = productFromVariant(variant);
    const productImage = readFirstImage(product);
    if (productImage) {
      return productImage;
    }
  }
  const pObj = firstNonEmptyRecord(row.product, row.product_id);
  if (Object.keys(pObj).length > 0) {
    const img = readFirstImage(pObj);
    if (img) {
      return img;
    }
  }
  return "";
}

export function cartLineVariantLabel(row: Record<string, unknown>): string {
  if (isComboItem(row)) {
    return "Combo gọng + tròng";
  }
  const v = variantObject(row);
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
  return getCartItemUnitPrice(row);
}

export function cartLineProductName(row: Record<string, unknown>): string {
  return getCartItemDisplayName(row);
}

export function cartLineImage(row: Record<string, unknown>): string {
  return getCartItemImage(row);
}

export function cartLineQuantity(row: Record<string, unknown>): number {
  const q = row.quantity ?? row.qty;
  return typeof q === "number" && q > 0 ? Math.floor(q) : 1;
}

export function cartLineId(row: Record<string, unknown>): string {
  const raw = row._id ?? row.id ?? row.item_id;
  return typeof raw === "string" ? raw : "";
}

export function cartLineComboId(row: Record<string, unknown>): string {
  const raw = row.combo_id;
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const id = o._id ?? o.id;
    if (typeof id === "string") {
      return id;
    }
  }
  const direct = row.comboId ?? row.combo_item_id;
  return typeof direct === "string" ? direct : "";
}

export function cartLineLensParams(row: Record<string, unknown>): Record<string, unknown> {
  const raw = row.lens_params;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function formatPriceVnd(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0đ";
  }
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}
