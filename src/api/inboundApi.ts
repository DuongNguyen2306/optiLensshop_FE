import axios from "@/lib/axios";
import { normalizeMongoId } from "@/lib/mongo-id";
import type {
  InboundLedgerEntry,
  InboundLedgerQuery,
  InboundLedgerResponse,
  InboundListQuery,
  InboundListResponse,
  InboundPayload,
  InboundReceipt,
} from "@/types/inbound";

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function readNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeList(data: unknown, fallbackPage: number, fallbackPageSize: number): InboundListResponse {
  const o = asObj(data);
  const nestedData = asObj(o.data);
  const items = asArray<InboundReceipt>(o.items).length
    ? asArray<InboundReceipt>(o.items)
    : asArray<InboundReceipt>(o.data).length
      ? asArray<InboundReceipt>(o.data)
      : asArray<InboundReceipt>(o.results).length
        ? asArray<InboundReceipt>(o.results)
        : asArray<InboundReceipt>(nestedData.items).length
          ? asArray<InboundReceipt>(nestedData.items)
          : asArray<InboundReceipt>(nestedData.inbounds).length
            ? asArray<InboundReceipt>(nestedData.inbounds)
            : asArray<InboundReceipt>(o.inbounds);

  const pg = asObj(o.pagination);
  const meta = asObj(o.meta);
  const nestedPg = asObj(nestedData.pagination);
  const page = readNum(pg.page ?? meta.page ?? nestedPg.page ?? o.page, fallbackPage);
  const pageSize = readNum(pg.pageSize ?? pg.limit ?? meta.pageSize ?? nestedPg.pageSize ?? o.pageSize ?? o.limit, fallbackPageSize);
  const total = readNum(pg.total ?? meta.total ?? nestedPg.total ?? o.total, items.length);
  const totalPages = readNum(
    pg.totalPages ?? pg.total_pages ?? meta.totalPages ?? nestedPg.totalPages ?? o.totalPages ?? o.total_pages,
    Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  );
  return {
    items,
    pagination: { page, pageSize, total, totalPages },
  };
}

function normalizeLedger(data: unknown, fallbackPage: number, fallbackPageSize: number): InboundLedgerResponse {
  const o = asObj(data);
  const nestedData = asObj(o.data);
  const items = asArray<InboundLedgerEntry>(o.items).length
    ? asArray<InboundLedgerEntry>(o.items)
    : asArray<InboundLedgerEntry>(o.data).length
      ? asArray<InboundLedgerEntry>(o.data)
      : asArray<InboundLedgerEntry>(o.ledger).length
        ? asArray<InboundLedgerEntry>(o.ledger)
        : asArray<InboundLedgerEntry>(nestedData.items).length
          ? asArray<InboundLedgerEntry>(nestedData.items)
          : asArray<InboundLedgerEntry>(nestedData.ledger);
  const pg = asObj(o.pagination);
  const meta = asObj(o.meta);
  const nestedPg = asObj(nestedData.pagination);
  const page = readNum(pg.page ?? meta.page ?? nestedPg.page ?? o.page, fallbackPage);
  const pageSize = readNum(pg.pageSize ?? pg.limit ?? meta.pageSize ?? nestedPg.pageSize ?? o.pageSize ?? o.limit, fallbackPageSize);
  const total = readNum(pg.total ?? meta.total ?? nestedPg.total ?? o.total, items.length);
  const totalPages = readNum(
    pg.totalPages ?? pg.total_pages ?? meta.totalPages ?? nestedPg.totalPages ?? o.totalPages ?? o.total_pages,
    Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  );
  return {
    items,
    pagination: { page, pageSize, total, totalPages },
  };
}

function normalizeDetail(data: unknown): InboundReceipt {
  const o = asObj(data);
  const d = asObj(o.data);
  if (Object.keys(d).length > 0 && (d._id || d.id || d.inbound_code)) return d as InboundReceipt;
  return o as InboundReceipt;
}

function buildInboundPayload(payload: InboundPayload): InboundPayload {
  return {
    ...payload,
    items: payload.items.map((item) => {
      const variantId = normalizeMongoId(item.variant_id);
      if (!variantId) {
        throw new Error("variant_id không hợp lệ (yêu cầu Mongo ObjectId).");
      }
      return {
        variant_id: variantId,
        qty_planned: Math.max(1, Math.floor(Number(item.qty_planned) || 0)),
        qty_received: item.qty_received == null ? undefined : Math.max(0, Math.floor(Number(item.qty_received) || 0)),
        import_price: Math.max(0, Number(item.import_price) || 0),
      };
    }),
  };
}

async function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch {
    return fallback();
  }
}

export async function getInbounds(params?: InboundListQuery): Promise<InboundListResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const query: Record<string, string | number> = { page, pageSize };
  if (params?.status) query.status = params.status;
  if (params?.type) query.type = params.type;
  if (params?.supplier_name) query.supplier_name = params.supplier_name;
  return withFallback(
    async () => {
      const { data } = await axios.get<unknown>("/inbounds", { params: query });
      return normalizeList(data, page, pageSize);
    },
    async () => {
      const { data } = await axios.get<unknown>("/api/ops/inbound", { params: query });
      return normalizeList(data, page, pageSize);
    }
  );
}

export async function getInboundById(id: string): Promise<InboundReceipt> {
  return withFallback(
    async () => {
      const { data } = await axios.get<unknown>(`/inbounds/${encodeURIComponent(id)}`);
      return normalizeDetail(data);
    },
    async () => {
      const { data } = await axios.get<unknown>(`/api/ops/inbound/${encodeURIComponent(id)}`);
      return normalizeDetail(data);
    }
  );
}

export async function createInbound(payload: InboundPayload): Promise<InboundReceipt> {
  const body = buildInboundPayload(payload);
  return withFallback(
    async () => {
      const { data } = await axios.post<unknown>("/inbounds", body);
      return normalizeDetail(data);
    },
    async () => {
      const { data } = await axios.post<unknown>("/api/ops/inbound", body);
      return normalizeDetail(data);
    }
  );
}

export async function updateInbound(id: string, payload: InboundPayload): Promise<InboundReceipt> {
  const body = buildInboundPayload(payload);
  return withFallback(
    async () => {
      const { data } = await axios.put<unknown>(`/inbounds/${encodeURIComponent(id)}`, body);
      return normalizeDetail(data);
    },
    async () => {
      const { data } = await axios.put<unknown>(`/api/ops/inbound/${encodeURIComponent(id)}`, body);
      return normalizeDetail(data);
    }
  );
}

async function postAction(id: string, action: string, body?: Record<string, unknown>): Promise<InboundReceipt> {
  return withFallback(
    async () => {
      const { data } = await axios.post<unknown>(`/inbounds/${encodeURIComponent(id)}/${action}`, body ?? {});
      return normalizeDetail(data);
    },
    async () => {
      const { data } = await axios.post<unknown>(`/api/ops/inbound/${encodeURIComponent(id)}/${action}`, body ?? {});
      return normalizeDetail(data);
    }
  );
}

export const submitInbound = (id: string) => postAction(id, "submit");
export const approveInbound = (id: string) => postAction(id, "approve");
export const rejectInbound = (id: string, note: string) => postAction(id, "reject", { note });
export const cancelInbound = (id: string, cancel_reason: string) => postAction(id, "cancel", { cancel_reason });
export const receiveInbound = (id: string) => postAction(id, "receive");
export const completeInbound = (id: string) => postAction(id, "complete");

export async function getInboundLedger(params?: InboundLedgerQuery): Promise<InboundLedgerResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const query: Record<string, string | number> = { page, pageSize };
  if (params?.variant_id) query.variant_id = params.variant_id;
  if (params?.event_type) query.event_type = params.event_type;
  if (params?.ref_type) query.ref_type = params.ref_type;
  if (params?.ref_id) query.ref_id = params.ref_id;
  return withFallback(
    async () => {
      const { data } = await axios.get<unknown>("/inbounds/ledger", { params: query });
      return normalizeLedger(data, page, pageSize);
    },
    async () => {
      const { data } = await axios.get<unknown>("/api/ops/inbound/ledger", { params: query });
      return normalizeLedger(data, page, pageSize);
    }
  );
}

