import axios from "@/lib/axios";
import type {
  AdminReturnsQuery,
  MyReturnsQuery,
  ReturnRequest,
  ReturnRequestCreatePayload,
} from "@/types/returns";

/* ─── Customer ─── */

export async function createReturnRequest(payload: ReturnRequestCreatePayload): Promise<{
  message?: string;
  returnRequest?: ReturnRequest;
}> {
  const { data } = await axios.post<unknown>("/returns", payload);
  return data as { message?: string; returnRequest?: ReturnRequest };
}

export async function fetchMyReturns(params: MyReturnsQuery = {}): Promise<{
  total: number;
  page: number;
  pageSize: number;
  returns: ReturnRequest[];
}> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  const { data } = await axios.get<unknown>("/returns/my", { params: query });
  const d = data as Record<string, unknown>;
  return {
    total: typeof d.total === "number" ? d.total : 0,
    page: typeof d.page === "number" ? d.page : 1,
    pageSize: typeof d.pageSize === "number" ? d.pageSize : 10,
    returns: Array.isArray(d.returns) ? (d.returns as ReturnRequest[]) : [],
  };
}

/* ─── Admin ─── */

export async function fetchAdminReturns(params: AdminReturnsQuery = {}): Promise<{
  total: number;
  page: number;
  pageSize: number;
  returns: ReturnRequest[];
}> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.order_id) query.order_id = params.order_id;
  if (params.condition) query.condition = params.condition;
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  const { data } = await axios.get<unknown>("/api/admin/returns", { params: query });
  const d = data as Record<string, unknown>;
  return {
    total: typeof d.total === "number" ? d.total : 0,
    page: typeof d.page === "number" ? d.page : 1,
    pageSize: typeof d.pageSize === "number" ? d.pageSize : 10,
    returns: Array.isArray(d.returns) ? (d.returns as ReturnRequest[]) : [],
  };
}

export async function fetchAdminReturnDetail(returnId: string): Promise<ReturnRequest> {
  const { data } = await axios.get<unknown>(`/api/admin/returns/${encodeURIComponent(returnId)}`);
  const d = data as Record<string, unknown>;
  return (d.returnRequest ?? d) as ReturnRequest;
}

/** PENDING → APPROVED: operations, manager, admin */
export async function approveReturn(
  returnId: string,
  payload?: { note?: string }
): Promise<{ message?: string; returnRequest?: ReturnRequest }> {
  const { data } = await axios.patch<unknown>(
    `/api/admin/returns/${encodeURIComponent(returnId)}/approve`,
    payload ?? {}
  );
  return data as { message?: string; returnRequest?: ReturnRequest };
}

/** APPROVED → INSPECTING: operations, manager, admin */
export async function receiveReturn(
  returnId: string,
  payload: { condition_at_receipt: string; note?: string }
): Promise<{ message?: string }> {
  const { data } = await axios.patch<unknown>(
    `/api/admin/returns/${encodeURIComponent(returnId)}/receive`,
    payload
  );
  return data as { message?: string };
}

/** Từ chối bất kỳ lúc nào trước hoàn tiền: operations, manager, admin */
export async function rejectReturn(
  returnId: string,
  payload: { rejected_reason: string }
): Promise<{ message?: string }> {
  const { data } = await axios.patch<unknown>(
    `/api/admin/returns/${encodeURIComponent(returnId)}/reject`,
    payload
  );
  return data as { message?: string };
}

/** INSPECTING → REFUNDED: CHỈ manager, admin.
 *  Backend trả 403 nếu role là operations.
 */
export async function refundReturn(returnId: string): Promise<{
  message?: string;
  returnRequest?: ReturnRequest;
  restockLog?: unknown[];
  finalOrderStatus?: string;
}> {
  const { data } = await axios.patch<unknown>(
    `/api/admin/returns/${encodeURIComponent(returnId)}/refund`,
    {}
  );
  return data as {
    message?: string;
    returnRequest?: ReturnRequest;
    restockLog?: unknown[];
    finalOrderStatus?: string;
  };
}
