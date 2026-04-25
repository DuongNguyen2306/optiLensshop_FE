import type { CustomerOrderListItem } from "@/types/order";

export function orderId(order: CustomerOrderListItem | null | undefined): string {
  if (!order) {
    return "";
  }
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}

export function orderStatus(order: CustomerOrderListItem | null | undefined): string {
  return normalizeOrderStatus(String(order?.status ?? ""));
}

export function normalizeOrderStatus(raw: string | undefined): string {
  const s = String(raw ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    "đã giao": "delivered",
    "dang giao": "shipped",
    "đang giao": "shipped",
    "đang giao hàng": "shipped",
    "da dong goi": "packed",
    "đã đóng gói": "packed",
    "hoan tat": "completed",
    "hoàn tất": "completed",
    "yeu cau tra hang": "return_requested",
    "yêu cầu trả hàng": "return_requested",
    "da tra hang": "returned",
    "đã trả hàng": "returned",
    "da hoan tien": "refunded",
    "đã hoàn tiền": "refunded",
    shipping: "shipped",
    fulfilled: "manufacturing",
  };
  return map[s] ?? s;
}

export function canCustomerCancelOrder(order: CustomerOrderListItem | null | undefined): boolean {
  const s = orderStatus(order);
  return s === "pending" || s === "confirmed";
}

export function orderReadableStatus(status: string | undefined): string {
  const s = normalizeOrderStatus(String(status ?? ""));
  if (s === "pending") return "Chờ xác nhận";
  if (s === "confirmed") return "Đã xác nhận";
  if (s === "processing") return "Đang xử lý";
  if (s === "fulfilled") return "Hoàn tất gia công";
  if (s === "manufacturing") return "Đang gia công tròng";
  if (s === "received") return "Hàng đã về kho";
  if (s === "packed") return "Đã đóng gói";
  if (s === "shipping") return "Đang giao";
  if (s === "shipped") return "Đang giao hàng";
  if (s === "delivered") return "Đã giao";
  if (s === "completed") return "Hoàn tất";
  if (s === "cancelled") return "Đã hủy";
  if (s === "return_requested") return "Yêu cầu trả hàng";
  if (s === "returned") return "Đã trả hàng";
  if (s === "refunded") return "Đã hoàn tiền";
  return status?.trim() || "—";
}

export function nextStatusesByOrderType(orderType: string | undefined, currentStatus: string): string[] {
  const type = String(orderType ?? "stock").toLowerCase().trim();
  const s = normalizeOrderStatus(currentStatus);
  const common: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    packed: ["shipped"],
    shipped: ["delivered"],
    delivered: ["completed", "return_requested"],
    return_requested: ["returned", "refunded"],
  };

  if (common[s]) {
    return common[s];
  }
  if (s === "processing") {
    if (type === "prescription") return ["manufacturing"];
    if (type === "pre_order") return ["received"];
    return ["packed", "shipped"];
  }
  if (s === "manufacturing") {
    return ["packed"];
  }
  if (s === "received") {
    return ["packed"];
  }
  return [];
}

/** Lọc danh sách đơn theo `order_type` backend: `stock` | `prescription` | `pre_order`. Rỗng = tất cả. */
export type OrderKindFilter = "" | "stock" | "prescription" | "pre_order";

export function orderMatchesKindFilter(order: { order_type?: string } | null | undefined, kind: OrderKindFilter): boolean {
  if (!kind) {
    return true;
  }
  const t = String(order?.order_type ?? "stock").toLowerCase().trim();
  return t === kind;
}

/** Giá trị gửi query `order_type` (GET /orders, /orders/all, ops…). Khớp từng loại với BE. */
export function orderTypeForListApi(kind: OrderKindFilter): string | undefined {
  return kind ? kind : undefined;
}
