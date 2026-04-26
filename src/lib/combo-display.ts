import type { Combo } from "@/types/combo";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function getVariantRecord(combo: Combo | Record<string, unknown>, key: "frame_variant_id" | "lens_variant_id") {
  return asRecord(combo[key]);
}

function getVariantProduct(variant: Record<string, unknown> | null) {
  return asRecord(variant?.product_id);
}

export function comboPreviewImage(combo: Combo | Record<string, unknown>): string {
  const frameVariant = getVariantRecord(combo, "frame_variant_id");
  const lensVariant = getVariantRecord(combo, "lens_variant_id");
  const frameProduct = getVariantProduct(frameVariant);
  const lensProduct = getVariantProduct(lensVariant);

  const candidates = [
    ...asStringArray(frameProduct?.images),
    ...asStringArray(lensProduct?.images),
    ...asStringArray(frameVariant?.images),
    ...asStringArray(lensVariant?.images),
    ...asStringArray((combo as Record<string, unknown>).images),
  ];

  return candidates[0] ?? "";
}

export function comboVariantInfo(
  combo: Combo | Record<string, unknown>,
  key: "frame_variant_id" | "lens_variant_id"
): { variantId: string; productName: string } {
  const variant = getVariantRecord(combo, key);
  const product = getVariantProduct(variant);

  const variantId = asString(variant?._id) || asString(variant?.id) || asString(combo[key]);
  const productName = asString(product?.name);

  return { variantId, productName };
}
