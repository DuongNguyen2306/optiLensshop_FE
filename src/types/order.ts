/** Thanh toán kèm đơn (GET /orders). */
export interface OrderPayment {
  order_id?: string;
  amount?: number;
  method?: string;
  status?: string;
  transaction_id?: string | null;
  paid_at?: string | null;
}

export type OrderType = "stock" | "prescription" | "pre_order";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "manufacturing"
  | "received"
  | "packed"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refunded";

/** Một đơn trong danh sách lịch sử. */
export interface CustomerOrderListItem {
  _id?: string;
  id?: string;
  user_id?: string;
  user?: Record<string, unknown> | null;
  order_type?: string;
  status?: string;
  total_amount?: number;
  final_amount?: number;
  shipping_fee?: number;
  shipping_address?: string;
  items?: OrderLineItem[];
  created_at?: string;
  updated_at?: string;
  payment?: OrderPayment | null;
  [key: string]: unknown;
}

export interface OrdersPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface CustomerOrdersListResponse {
  items: CustomerOrderListItem[];
  pagination: OrdersPagination;
}

export interface OrderLineItem {
  _id?: string;
  id?: string;
  variant_id?: string | Record<string, unknown>;
  combo_id?: string | Record<string, unknown>;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  lens_params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OrderDetailResponse {
  order?: CustomerOrderListItem | null;
  message?: string;
}

export interface InternalOrdersQuery {
  page?: number;
  limit?: number;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  /** `stock` | `prescription` | `pre_order` — lọc danh sách theo loại đơn. */
  order_type?: string;
}

/** Giá trị filter status gửi lên API (chuỗi rỗng = tất cả). */
export const ORDER_STATUS_FILTER_VALUES = [
  "",
  "pending",
  "confirmed",
  "processing",
  "manufacturing",
  "received",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
] as const;
