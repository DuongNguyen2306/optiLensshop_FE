import axios from "@/lib/axios";
import { normalizeMongoId } from "@/lib/mongo-id";
import type {
  CreateInventoryReceiptBody,
  InventoryLedgerEntry,
  InventoryLedgerListResponse,
  InventoryLedgerQuery,
  InventoryPagination,
  InventoryReceipt,
  InventoryReceiptsListResponse,
  InventoryReceiptsQuery,
} from "@/types/inventory";

function asReceiptArray(data: unknown): InventoryReceipt[] {
  if (Array.isArray(data)) return data as InventoryReceipt[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items as InventoryReceipt[];
  if (Array.isArray(o.data)) return o.data as InventoryReceipt[];
  if (Array.isArray(o.receipts)) return o.receipts as InventoryReceipt[];
  return [];
}

function asLedgerArray(data: unknown): InventoryLedgerEntry[] {
  if (Array.isArray(data)) return data as InventoryLedgerEntry[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items as InventoryLedgerEntry[];
  if (Array.isArray(o.data)) return o.data as InventoryLedgerEntry[];
  if (Array.isArray(o.ledger)) return o.ledger as InventoryLedgerEntry[];
  return [];
}

function parsePagination(data: unknown, fallbackTotal: number, fallbackLimit: number): InventoryPagination {
  if (!data || typeof data !== "object") {
    return { page: 1, limit: fallbackLimit, total: fallbackTotal, total_pages: 1 };
  }
  const o = data as Record<string, unknown>;
  const p = (o.pagination ?? o.meta ?? o.page_info ?? null) as Record<string, unknown> | null;
  if (!p || typeof p !== "object") {
    return { page: 1, limit: fallbackLimit, total: fallbackTotal, total_pages: 1 };
  }
  const page = typeof p.page === "number" ? p.page : Number(p.page) || 1;
  const limit = typeof p.limit === "number" ? p.limit : Number(p.limit) || fallbackLimit;
  const total = typeof p.total === "number" ? p.total : Number(p.total) || fallbackTotal;
  const totalPages = typeof p.total_pages === "number" ? p.total_pages : Number(p.total_pages) || Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, total_pages: totalPages };
}

export async function listInventoryReceipts(params?: InventoryReceiptsQuery): Promise<InventoryReceiptsListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const query: Record<string, string | number> = { page, limit };
  if (params?.status?.trim()) query.status = params.status.trim();
  if (params?.variant_id?.trim()) {
    const variantId = normalizeMongoId(params.variant_id);
    if (variantId) {
      query.variant_id = variantId;
    }
  }
  const { data } = await axios.get<unknown>("/inventory/receipts", { params: query });
  const items = asReceiptArray(data);
  return {
    items,
    pagination: parsePagination(data, items.length, limit),
  };
}

export async function createInventoryReceipt(body: CreateInventoryReceiptBody) {
  const variantId = normalizeMongoId(body.variant_id);
  if (!variantId) {
    throw new Error("variant_id không hợp lệ (yêu cầu Mongo ObjectId).");
  }
  const payload: CreateInventoryReceiptBody = {
    ...body,
    variant_id: variantId,
  };
  const { data } = await axios.post<unknown>("/inventory/receipts", payload);
  return data;
}

export async function confirmInventoryReceipt(receiptId: string) {
  const { data } = await axios.patch<unknown>(`/inventory/receipts/${encodeURIComponent(receiptId)}/confirm`);
  return data;
}

export async function listInventoryLedger(params?: InventoryLedgerQuery): Promise<InventoryLedgerListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query: Record<string, string | number> = { page, limit };
  if (params?.variant_id?.trim()) {
    const variantId = normalizeMongoId(params.variant_id);
    if (variantId) {
      query.variant_id = variantId;
    }
  }
  if (params?.event_type?.trim()) query.event_type = params.event_type.trim();
  const { data } = await axios.get<unknown>("/inventory/ledger", { params: query });
  const items = asLedgerArray(data);
  return {
    items,
    pagination: parsePagination(data, items.length, limit),
  };
}
