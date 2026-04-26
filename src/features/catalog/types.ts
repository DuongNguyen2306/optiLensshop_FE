export type ProductType = "frame" | "lens" | "accessory";

export type ModelType = "frame" | "lens";

export interface ProductVariantInput {
  sku?: string;
  attributes?: Record<string, unknown>;
  color?: string;
  size?: string;
  bridge_fit?: string;
  diameter?: string;
  base_curve?: string;
  power?: string;
  price: number;
  images?: unknown[];
  available_quantity?: number;
  reserved_quantity?: number;
}

export interface ProductVariantSummary {
  _id?: string;
  id?: string;
  sku?: string;
  attributes?: Record<string, unknown>;
  price?: number;
  stock_quantity?: number;
  images?: unknown[];
  [key: string]: unknown;
}

export interface Product {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  type?: ProductType;
  category?: string;
  brand?: string;
  model?: string;
  material?: string;
  description?: string;
  variants?: ProductVariantSummary[];
  [key: string]: unknown;
}

export interface Category {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  parent_id?: string | null;
}

export interface Brand {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  logo?: string;
}

export interface CatalogModel {
  _id?: string;
  id?: string;
  name: string;
  type: ModelType;
  description?: string;
}

export function entityId(e: { _id?: string; id?: string } | undefined): string {
  if (!e) {
    return "";
  }
  const raw = e._id ?? e.id;
  return typeof raw === "string" ? raw : "";
}
