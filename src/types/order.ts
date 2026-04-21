/** Thanh toán kèm đơn (GET /orders). */
export interface OrderPayment {
  order_id?: string;
  amount?: number;
  method?: string;
  status?: string;
  transaction_id?: string | null;
  paid_at?: string | null;
}

/** Một đơn trong danh sách lịch sử. */
export interface CustomerOrderListItem {
  _id?: string;
  user_id?: string;
  order_type?: string;
  status?: string;
  total_amount?: number;
  shipping_fee?: number;
  shipping_address?: string;
  created_at?: string;
  payment?: OrderPayment | null;
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

/** Giá trị filter status gửi lên API (chuỗi rỗng = tất cả). */
export const ORDER_STATUS_FILTER_VALUES = [
  "",
  "pending",
  "confirmed",
  "processing",
  "manufacturing",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;
