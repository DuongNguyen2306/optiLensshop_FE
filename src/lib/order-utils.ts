import type { CustomerOrderListItem } from "@/types/order";

export function orderId(order: CustomerOrderListItem | null | undefined): string {
  if (!order) {
    return "";
  }
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}

export function orderStatus(order: CustomerOrderListItem | null | undefined): string {
  return String(order?.status ?? "").toLowerCase().trim();
}

export function canCustomerCancelOrder(order: CustomerOrderListItem | null | undefined): boolean {
  const s = orderStatus(order);
  return s === "pending" || s === "confirmed";
}

export function orderReadableStatus(status: string | undefined): string {
  const s = String(status ?? "").toLowerCase().trim();
  if (s === "pending") return "Chờ xác nhận";
  if (s === "confirmed") return "Đã xác nhận";
  if (s === "processing") return "Đang xử lý";
  if (s === "received") return "Đã nhập kho";
  if (s === "manufacturing") return "Đang gia công";
  if (s === "packed") return "Đã đóng gói";
  if (s === "shipped") return "Đang giao";
  if (s === "delivered") return "Đã giao";
  if (s === "completed") return "Hoàn tất";
  if (s === "cancelled") return "Đã hủy";
  if (s === "return_requested") return "Yêu cầu trả hàng";
  if (s === "returned") return "Đã trả hàng";
  if (s === "refunded") return "Đã hoàn tiền";
  return status?.trim() || "—";
}

export function nextOpsStatuses(currentStatus: string): string[] {
  const s = currentStatus.toLowerCase().trim();
  const map: Record<string, string[]> = {
    confirmed: ["processing"],
    processing: ["manufacturing", "received", "packed"],
    manufacturing: ["packed"],
    received: ["packed"],
    packed: ["shipped"],
    shipped: ["delivered"],
    delivered: ["completed", "return_requested"],
    return_requested: ["returned", "refunded"],
  };
  return map[s] ?? [];
}
