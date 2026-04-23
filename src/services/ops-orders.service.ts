import axios from "@/lib/axios";

export type OpsOrderStatus =
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
export type OpsFilterStatus = "processing" | "manufacturing" | "received" | "packed" | "shipped" | "delivered";

export interface OpsOrdersQuery {
  status?: OpsFilterStatus;
  page?: number;
  pageSize?: number;
}

export async function getOpsOrders(params?: OpsOrdersQuery): Promise<Record<string, unknown>> {
  const query: Record<string, string | number> = {};
  if (params?.status) query.status = params.status;
  if (typeof params?.page === "number") query.page = params.page;
  if (typeof params?.pageSize === "number") query.pageSize = params.pageSize;
  const { data } = await axios.get<unknown>("/api/ops/orders", { params: query });
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function startProcessing(orderId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.patch<unknown>(`/api/ops/orders/${encodeURIComponent(orderId)}/start-processing`);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function fulfillOrder(orderId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.patch<unknown>(`/api/ops/orders/${encodeURIComponent(orderId)}/fulfill`);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}
