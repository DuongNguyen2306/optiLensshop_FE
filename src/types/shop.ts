import type { Product } from "@/features/catalog/types";

/** Biến thể trả về kèm GET /products/:slug hoặc GET /products/:id/variants */
export type ShopVariant = Record<string, unknown> & {
  _id?: string;
  id?: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
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
  lens_params?: Record<string, unknown>;
}

export type OrderType = "stock" | "preorder" | "prescription";
export type PaymentMethod = "momo" | "cod";
export type ShippingMethod = "ship" | "pickup";

export interface CheckoutPayload {
  shipping_address: string;
  order_type: OrderType;
  payment_method: PaymentMethod;
  shipping_method: ShippingMethod;
  /** [] = thanh toán cả giỏ */
  items: { variant_id?: string; combo_id?: string; quantity: number }[];
}

export interface CheckoutResponse {
  message?: string;
  order?: unknown;
  orderId?: string;
  payUrl?: string;
}
