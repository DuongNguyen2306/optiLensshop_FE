import axios from "@/lib/axios";
import { extractPayUrlFromCheckoutResponse, unwrapCheckoutResponseRoot } from "@/lib/checkout-utils";
import type {
  CustomerOrderListItem,
  CustomerOrdersListResponse,
  InternalOrdersQuery,
  OrderDetailResponse,
} from "@/types/order";
import type { CheckoutPayload, CheckoutResponse } from "@/types/shop";

export async function fetchMyOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<CustomerOrdersListResponse> {
  const { page = 1, limit = 10, status } = params;
  const query: Record<string, string | number> = { page, limit };
  if (status && status.trim()) {
    query.status = status.trim();
  }
  const { data } = await axios.get<unknown>("/orders", { params: query });
  return normalizeOrdersResponse(data);
}

/** BE checkout chỉ chấp nhận `momo` | `cod` chữ thường. */
function normalizePaymentMethodForApi(raw: CheckoutPayload["payment_method"] | string): "momo" | "cod" {
  const s = String(raw).toLowerCase().trim();
  if (s === "momo") {
    return "momo";
  }
  return "cod";
}

function readOrderIdFromUnknown(order: unknown): string | undefined {
  if (!order || typeof order !== "object") {
    return undefined;
  }
  const rec = order as Record<string, unknown>;
  const raw = rec._id ?? rec.id ?? rec.orderId ?? rec.order_id;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return undefined;
}

/** POST /orders/checkout - hỗ trợ extract payUrl/orderId đa dạng payload backend. */
export async function postCheckout(body: CheckoutPayload): Promise<CheckoutResponse> {
  const payload: CheckoutPayload = {
    ...body,
    payment_method: normalizePaymentMethodForApi(body.payment_method),
  };
  const { data } = await axios.post<unknown>("/orders/checkout", payload);
  const rec = unwrapCheckoutResponseRoot(data);
  const extracted = extractPayUrlFromCheckoutResponse(data);
  const shallow = typeof rec.payUrl === "string" ? rec.payUrl.trim() : "";
  const merged = (shallow && /^https?:\/\//i.test(shallow) ? shallow : undefined) ?? extracted;
  const payUrl = merged && merged.length > 0 ? merged : undefined;
  const order = rec.order;
  const directOrderId =
    typeof rec.orderId === "string"
      ? rec.orderId.trim()
      : typeof rec.order_id === "string"
        ? rec.order_id.trim()
        : undefined;
  const orderId = directOrderId || readOrderIdFromUnknown(order);
  return {
    message: typeof rec.message === "string" ? rec.message : undefined,
    order,
    orderId,
    payUrl,
  };
}

export async function fetchMyOrderDetail(orderId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.get<unknown>(`/orders/${encodeURIComponent(orderId)}`);
  if (data && typeof data === "object" && "order" in data) {
    const rec = data as Record<string, unknown>;
    return {
      order: (rec.order as Record<string, unknown>) ?? null,
      message: typeof rec.message === "string" ? rec.message : undefined,
    } as OrderDetailResponse as Record<string, unknown>;
  }
  if (data && typeof data === "object") {
    return { order: data } as OrderDetailResponse as Record<string, unknown>;
  }
  return { order: null };
}

export async function cancelMyOrder(orderId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.put<unknown>(`/orders/${encodeURIComponent(orderId)}/cancel`);
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

export async function fetchAllOrders(params?: InternalOrdersQuery): Promise<Record<string, unknown>> {
  const { data } = await axios.get<unknown>("/orders/all", { params });
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

export async function confirmOrder(
  orderId: string,
  payload?: {
    action?: "confirm" | "reject";
    reason?: string;
    note?: string;
  }
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {};
  if (payload?.action) {
    body.action = payload.action;
  }
  if (payload?.reason?.trim()) {
    body.reason = payload.reason.trim();
  }
  if (payload?.note?.trim()) {
    body.note = payload.note.trim();
  }
  const { data } = await axios.post<unknown>(`/orders/${encodeURIComponent(orderId)}/confirm`, body);
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

export async function updateOrderStatus(
  orderId: string,
  payload: {
    status: string;
    note?: string;
  }
): Promise<Record<string, unknown>> {
  const { data } = await axios.put<unknown>(`/orders/${encodeURIComponent(orderId)}/status`, payload);
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

function normalizeOrdersResponse(data: unknown): CustomerOrdersListResponse {
  // Direct array response
  if (Array.isArray(data)) {
    return {
      items: data as CustomerOrderListItem[],
      pagination: { page: 1, limit: data.length || 10, total: data.length, total_pages: 1 },
    };
  }

  if (!data || typeof data !== "object") {
    return { items: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 0 } };
  }

  const o = data as Record<string, unknown>;

  // Thử nhiều tên field mà backend có thể dùng
  const rawItems =
    Array.isArray(o.items) ? o.items :
    Array.isArray(o.orders) ? o.orders :
    Array.isArray(o.data) ? o.data :
    Array.isArray(o.results) ? o.results :
    [];
  const items = rawItems as CustomerOrderListItem[];

  // Thử nhiều tên field pagination
  const p = (o.pagination ?? o.meta ?? o.page_info ?? null) as Record<string, unknown> | null;
  let pagination = {
    page: 1,
    limit: 10,
    total: typeof o.total === "number" ? o.total : items.length,
    total_pages: 1,
  };
  if (p && typeof p === "object") {
    pagination = {
      page: typeof p.page === "number" ? p.page : Number(p.page) || 1,
      limit: typeof p.limit === "number" ? p.limit : Number(p.limit) || 10,
      total: typeof p.total === "number" ? p.total : Number(p.total) || items.length,
      total_pages: typeof p.total_pages === "number" ? p.total_pages : Number(p.total_pages) || 1,
    };
  }
  return { items, pagination };
}
