export interface ProductVariant {
  _id?: string;
  id?: string;
  product_id?: string;
  sku?: string;
  price?: number;
  images?: string[];
  color?: string;
  size?: string;
  bridge_fit?: string;
  diameter?: string;
  base_curve?: string;
  power?: string;
  stock_quantity?: number;
  reserved_quantity?: number;
  available_quantity?: number;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface CreateVariantPayload {
  sku?: string;
  price: number;
  images?: string[];
  color?: string;
  size?: string;
  bridge_fit?: string;
  diameter?: string;
  base_curve?: string;
  power?: string;
}

export type UpdateVariantPayload = Partial<CreateVariantPayload>;

export interface VariantFormValues {
  sku?: string;
  price: number;
  color?: string;
  size?: string;
  bridge_fit?: string;
  diameter?: string;
  base_curve?: string;
  power?: string;
}

export interface VariantFormSubmitPayload {
  values: VariantFormValues;
  existingImageUrls: string[];
  newImageFiles: File[];
}

export interface DeleteVariantResponse {
  message?: string;
  variant?: ProductVariant;
  soft_disabled?: boolean;
  [key: string]: unknown;
}

export interface ApiErrorShape {
  message?: string;
  errors?: Record<string, string | string[]>;
  code?: string;
  statusCode?: number;
}

