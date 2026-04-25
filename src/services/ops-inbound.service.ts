import axios from "@/lib/axios";

export type InboundStatus = "PENDING" | "COMPLETED";

export interface InboundListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}

export async function getInboundList(params?: InboundListQuery): Promise<Record<string, unknown>> {
  const query: Record<string, string | number> = {};
  if (typeof params?.page === "number") query.page = params.page;
  if (typeof params?.pageSize === "number") query.pageSize = params.pageSize;
  if (params?.status?.trim()) query.status = params.status.trim();
  if (params?.type?.trim()) query.type = params.type.trim();
  const { data } = await axios.get<unknown>("/api/ops/inbound", { params: query });
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function getInboundDetail(inboundId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.get<unknown>(`/api/ops/inbound/${encodeURIComponent(inboundId)}`);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function autoGenerateInboundByOrders(orderIds: string[]): Promise<Record<string, unknown>> {
  const { data } = await axios.post<unknown>("/api/ops/inbound/auto-generate", { orderIds });
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function completeInbound(inboundId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.patch<unknown>(`/api/ops/inbound/${encodeURIComponent(inboundId)}/complete`);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}
