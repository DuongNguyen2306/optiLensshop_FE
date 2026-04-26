import axios from "@/lib/axios";
import { extractPayUrlFromCheckoutResponse, unwrapCheckoutResponseRoot } from "@/lib/checkout-utils";
import { normalizeMongoId } from "@/lib/mongo-id";
import type {
  CustomerOrderListItem,
  CustomerOrdersListResponse,
  InternalOrdersQuery,
  OrderDetailResponse,
} from "@/types/order";
import type { CheckoutPayload, CheckoutResponse } from "@/types/shop";

function toFiniteNumberOrDefault(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeLensParams(raw: unknown): Record<string, number | string> | null {
  if (raw == null) {
    return null;
  }
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const normalized = {
    sph_right: toFiniteNumberOrDefault(src.sph_right, 0),
    sph_left: toFiniteNumberOrDefault(src.sph_left, 0),
    cyl_right: toFiniteNumberOrDefault(src.cyl_right, 0),
    cyl_left: toFiniteNumberOrDefault(src.cyl_left, 0),
    axis_right: toFiniteNumberOrDefault(src.axis_right, 0),
    axis_left: toFiniteNumberOrDefault(src.axis_left, 0),
    add_right: toFiniteNumberOrDefault(src.add_right, 0),
    add_left: toFiniteNumberOrDefault(src.add_left, 0),
    pd: toFiniteNumberOrDefault(src.pd, 0),
    pupillary_distance: toFiniteNumberOrDefault(src.pupillary_distance, 0),
    note: typeof src.note === "string" ? src.note.trim() : "",
  };
  const numericAllZero =
    normalized.sph_right === 0 &&
    normalized.sph_left === 0 &&
    normalized.cyl_right === 0 &&
    normalized.cyl_left === 0 &&
    normalized.axis_right === 0 &&
    normalized.axis_left === 0 &&
    normalized.add_right === 0 &&
    normalized.add_left === 0 &&
    normalized.pd === 0 &&
    normalized.pupillary_distance === 0;
  const noteNormalized = normalized.note.toLowerCase();
  const noteIsDefaultOrEmpty = !normalized.note || noteNormalized === "không có ghi chú";
  if (numericAllZero && noteIsDefaultOrEmpty) {
    return null;
  }
  return {
    ...normalized,
    note: normalized.note || "Không có ghi chú",
  };
}

function normalizeCheckoutItems(items: CheckoutPayload["items"]): CheckoutPayload["items"] {
  if (!Array.isArray(items)) {
    return items;
  }
  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("items[] không hợp lệ.");
    }
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("quantity không hợp lệ.");
    }
    if (item.variant_id && item.combo_id) {
      throw new Error("Mỗi item chỉ được chứa một trong hai: variant_id hoặc combo_id.");
    }
    if (item.variant_id) {
      const variantId = normalizeMongoId(item.variant_id);
      if (!variantId) {
        throw new Error("variant_id không hợp lệ (yêu cầu Mongo ObjectId).");
      }
      return {
        variant_id: String(variantId),
        quantity: Math.floor(quantity),
        lens_params: normalizeLensParams(item.lens_params),
      };
    }
    if (item.combo_id) {
      const comboId = normalizeMongoId(item.combo_id);
      if (!comboId) {
        throw new Error("combo_id không hợp lệ (yêu cầu Mongo ObjectId).");
      }
      return {
        combo_id: String(comboId),
        quantity: Math.floor(quantity),
        lens_params: normalizeLensParams(item.lens_params),
      };
    }
    throw new Error("items[] thiếu variant_id hoặc combo_id.");
  });
}

export async function fetchMyOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  order_type?: string;
}): Promise<CustomerOrdersListResponse> {
  const { page = 1, limit = 10, status, order_type } = params;
  const query: Record<string, string | number> = { page, limit };
  if (status && status.trim()) {
    query.status = status.trim();
  }
  if (order_type && order_type.trim()) {
    query.order_type = order_type.trim();
  }
  const { data } = await axios.get<unknown>("/orders", { params: query });
  return normalizeOrdersResponse(data);
}

/** BE checkout chỉ chấp nhận method chữ thường. */
function normalizePaymentMethodForApi(raw: CheckoutPayload["payment_method"] | string): "momo" | "cod" | "vnpay" {
  const s = String(raw).toLowerCase().trim();
  if (s === "momo") {
    return "momo";
  }
  if (s === "vnpay") {
    return "vnpay";
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
    items: normalizeCheckoutItems(body.items),
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

/** POST /orders/preorder-now cho luồng mua trước không qua cart. */
export async function postPreorderNow(
  body: Omit<CheckoutPayload, "items"> & {
    items: Array<
      | { variant_id: string; quantity: number; lens_params?: Record<string, unknown> | null }
      | { combo_id: string; quantity: number; lens_params?: Record<string, unknown> | null }
    >;
  }
): Promise<CheckoutResponse> {
  const normalizedItems = body.items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("quantity không hợp lệ.");
    }
    if ("variant_id" in item && "combo_id" in (item as Record<string, unknown>)) {
      throw new Error("Mỗi item chỉ được chứa một trong hai: variant_id hoặc combo_id.");
    }
    if ("variant_id" in item) {
      const variantId = normalizeMongoId(item.variant_id);
      if (!variantId) {
        throw new Error("variant_id không hợp lệ (yêu cầu Mongo ObjectId).");
      }
      return {
        variant_id: String(variantId),
        quantity: Math.floor(quantity),
        lens_params: normalizeLensParams(item.lens_params),
      };
    }
    if ("combo_id" in item) {
      const comboId = normalizeMongoId(item.combo_id);
      if (!comboId) {
        throw new Error("combo_id không hợp lệ (yêu cầu Mongo ObjectId).");
      }
      return {
        combo_id: String(comboId),
        quantity: Math.floor(quantity),
        lens_params: normalizeLensParams(item.lens_params),
      };
    }
    throw new Error("items[] thiếu variant_id hoặc combo_id.");
  });
  const payload = {
    ...body,
    payment_method: normalizePaymentMethodForApi(body.payment_method),
    items: normalizedItems,
  };
  const { data } = await axios.post<unknown>("/orders/preorder-now", payload);
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

export async function updateOrderShippingInfo(
  orderId: string,
  payload: { shipping_carrier: string; tracking_code: string }
): Promise<{ message?: string; order?: Record<string, unknown> }> {
  const { data } = await axios.patch<unknown>(
    `/orders/${encodeURIComponent(orderId)}/shipping-info`,
    payload
  );
  return data as { message?: string; order?: Record<string, unknown> };
}

export async function cancelMyOrder(orderId: string, reason?: string): Promise<Record<string, unknown>> {
  const payload = reason?.trim() ? { reason: reason.trim() } : {};
  const { data } = await axios.put<unknown>(`/orders/${encodeURIComponent(orderId)}/cancel`, payload);
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

export async function fetchAllOrders(params?: InternalOrdersQuery): Promise<Record<string, unknown>> {
  const query: Record<string, string | number> = {};
  if (params) {
    if (typeof params.page === "number") query.page = params.page;
    if (typeof params.limit === "number") query.limit = params.limit;
    if (params.status?.trim()) query.status = params.status.trim();
    if (params.payment_method?.trim()) query.payment_method = params.payment_method.trim();
    if (params.payment_status?.trim()) query.payment_status = params.payment_status.trim();
    if (params.order_type?.trim()) query.order_type = params.order_type.trim();
  }
  const { data } = await axios.get<unknown>("/orders/all", { params: query });
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
  try {
    const { data } = await axios.put<unknown>(`/api/orders/${encodeURIComponent(orderId)}/status`, payload);
    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
    return {};
  } catch {
    const { data } = await axios.put<unknown>(`/orders/${encodeURIComponent(orderId)}/status`, payload);
    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
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
