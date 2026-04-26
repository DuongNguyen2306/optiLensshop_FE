export type VariantType = "frame" | "lens";

export interface VariantProductLite {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface Variant {
  _id?: string;
  id?: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
  reserved_quantity?: number;
  stock_type?: string;
  product?: VariantProductLite;
  product_id?: VariantProductLite;
  [key: string]: unknown;
}

export interface VariantsListResponse {
  items: Variant[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface FetchVariantsParams {
  type: VariantType;
  search?: string;
  page?: number;
  limit?: number;
}
