import type { Product } from "@/features/catalog/types";

/** Biến thể trả về kèm GET /products/:slug hoặc GET /products/:id/variants */
export type ShopVariant = Record<string, unknown> & {
  _id?: string;
  id?: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
  reserved_quantity?: number;
  stock_type?: "in_stock" | "preorder" | "discontinued" | string;
};

export interface ProductDetailPayload {
  product: Product;
  variants: ShopVariant[];
}

/** Gửi đúng một trong hai: variant_id hoặc combo_id (theo BE). */
export interface AddCartItemBody {
  variant_id?: string;
  combo_id?: string;
  quantity: number;
  lens_params?: LensParams | null;
}

export type PaymentMethod = "momo" | "cod" | "vnpay";
export type ShippingMethod = "ship" | "pickup";

export interface LensParams {
  sph_right?: number | string;
  sph_left?: number | string;
  cyl_right?: number | string;
  cyl_left?: number | string;
  axis_right?: number | string;
  axis_left?: number | string;
  add_right?: number | string;
  add_left?: number | string;
  pd?: number | string;
  pupillary_distance?: number | string;
  note?: string;
  [key: string]: unknown;
}

export interface CheckoutItemPayload {
  variant_id?: string;
  combo_id?: string;
  quantity: number;
  lens_params?: LensParams | null;
}

export interface CheckoutPayload {
  shipping_address: string | Record<string, unknown>;
  receiver_name?: string;
  recipient_name?: string;
  full_name?: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  payment_method: PaymentMethod;
  shipping_method: ShippingMethod;
  deposit_rate?: number;
  discount_amount?: number;
  /** Không truyền hoặc [] = thanh toán cả giỏ */
  items?: CheckoutItemPayload[];
  prescription_image?: string;
  optometrist_name?: string;
  clinic_name?: string;
}

export interface CheckoutResponse {
  message?: string;
  order?: unknown;
  orderId?: string;
  payUrl?: string;
}
