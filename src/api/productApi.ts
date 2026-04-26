import {
  createProductMultipart,
  createProductVariant,
  deleteProductVariant,
  fetchProductVariants,
  fetchProducts,
  updateProductMultipart,
  updateProductVariant,
} from "@/features/catalog/api";
import type { ProductVariantInput } from "@/features/catalog/types";
import type { DeleteVariantResponse, ProductVariant } from "@/types/product";

type VariantStocklessPayload = Omit<ProductVariantInput, "stock_quantity" | "reserved_quantity"> & {
  color?: string;
  size?: string;
  bridge_fit?: string;
  diameter?: string;
  base_curve?: string;
  power?: string;
};

function sanitizeVariantPayload(body: VariantStocklessPayload): ProductVariantInput {
  const payload = { ...body } as Record<string, unknown>;
  delete payload.stock_quantity;
  delete payload.reserved_quantity;
  return payload as ProductVariantInput;
}

function normalizeVariantsResponse(data: unknown): ProductVariant[] {
  if (Array.isArray(data)) {
    return data as ProductVariant[];
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.variants)) {
    return o.variants as ProductVariant[];
  }
  if (Array.isArray(o.items)) {
    return o.items as ProductVariant[];
  }
  if (Array.isArray(o.data)) {
    return o.data as ProductVariant[];
  }
  return [];
}

export {
  fetchProducts,
  createProductMultipart,
  updateProductMultipart,
};

export async function createVariantStockless(productId: string, body: VariantStocklessPayload) {
  return createProductVariant(productId, sanitizeVariantPayload(body));
}

export async function updateVariantStockless(productId: string, variantId: string, body: Partial<VariantStocklessPayload>) {
  return updateProductVariant(productId, variantId, sanitizeVariantPayload(body as VariantStocklessPayload));
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const data = await fetchProductVariants(productId);
  return normalizeVariantsResponse(data);
}

export async function createVariant(productId: string, payloadFormData: FormData): Promise<ProductVariant> {
  const data = await createProductVariant(productId, payloadFormData);
  const variants = normalizeVariantsResponse(data);
  if (variants[0]) return variants[0];
  return (data as ProductVariant) ?? {};
}

export async function updateVariant(productId: string, variantId: string, payloadFormData: FormData): Promise<ProductVariant> {
  const data = await updateProductVariant(productId, variantId, payloadFormData);
  const variants = normalizeVariantsResponse(data);
  if (variants[0]) return variants[0];
  return (data as ProductVariant) ?? {};
}

export async function deleteVariant(productId: string, variantId: string): Promise<DeleteVariantResponse> {
  const data = await deleteProductVariant(productId, variantId);
  if (data && typeof data === "object") {
    return data as DeleteVariantResponse;
  }
  return {};
}

