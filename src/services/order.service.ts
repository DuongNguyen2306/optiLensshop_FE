import axios from "@/lib/axios";
import { extractPayUrlFromCheckoutResponse, unwrapCheckoutResponseRoot } from "@/lib/checkout-utils";
import type { CustomerOrderListItem, CustomerOrdersListResponse } from "@/types/order";
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

function normalizeOrdersResponse(data: unknown): CustomerOrdersListResponse {
  if (!data || typeof data !== "object") {
    return { items: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 0 } };
  }
  const o = data as Record<string, unknown>;
  const items = Array.isArray(o.items) ? (o.items as CustomerOrderListItem[]) : [];
  const p = o.pagination;
  let pagination = { page: 1, limit: 10, total: 0, total_pages: 0 };
  if (p && typeof p === "object") {
    const pg = p as Record<string, unknown>;
    pagination = {
      page: typeof pg.page === "number" ? pg.page : Number(pg.page) || 1,
      limit: typeof pg.limit === "number" ? pg.limit : Number(pg.limit) || 10,
      total: typeof pg.total === "number" ? pg.total : Number(pg.total) || 0,
      total_pages: typeof pg.total_pages === "number" ? pg.total_pages : Number(pg.total_pages) || 0,
    };
  }
  return { items, pagination };
}
