import type { PaginationResponse } from "@/types/pagination";

export type InboundType = "PURCHASE" | "RETURN_RESTOCK" | "OPENING_BALANCE";
export type InboundStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export interface InboundItemInput {
  variant_id: string;
  qty_planned: number;
  qty_received?: number;
  import_price: number;
}

export interface InboundItem {
  _id?: string;
  id?: string;
  variant_id?: string | Record<string, unknown>;
  qty_planned?: number;
  qty_received?: number;
  import_price?: number;
  line_total?: number;
  [key: string]: unknown;
}

export interface InboundAllocation {
  order_id?: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface AllocationSummaryEntry {
  variant_id?: string | Record<string, unknown>;
  received_qty?: number;
  allocated_qty?: number;
  unallocated_qty?: number;
  allocations?: InboundAllocation[];
  [key: string]: unknown;
}

export interface HistoryLog {
  _id?: string;
  id?: string;
  action?: string;
  from_status?: InboundStatus | string;
  to_status?: InboundStatus | string;
  note?: string;
  created_by?: string | Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface InboundReceipt {
  _id?: string;
  id?: string;
  inbound_code?: string;
  type?: InboundType | string;
  status?: InboundStatus | string;
  supplier_name?: string;
  expected_date?: string;
  note?: string;
  total_value?: number;
  created_by?: string | Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
  items?: InboundItem[];
  allocation_summary?: AllocationSummaryEntry[] | Record<string, unknown>;
  history_log?: HistoryLog[];
  reference_orders?: Array<string | { _id?: string; id?: string; order_id?: string }>;
  [key: string]: unknown;
}

export interface InboundListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  supplier_name?: string;
  reference_order_id?: string;
}

export interface InboundListResponse extends PaginationResponse<InboundReceipt> {}

export interface InboundPayload {
  type: InboundType;
  supplier_name?: string;
  expected_date?: string;
  note?: string;
  items: InboundItemInput[];
}

export interface InboundLedgerEntry {
  _id?: string;
  id?: string;
  variant_id?: string | Record<string, unknown>;
  event_type?: string;
  quantity_delta?: number;
  stock_before?: number;
  stock_after?: number;
  note?: string;
  ref_type?: string;
  ref_id?: string;
  created_by?: string | Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface InboundLedgerQuery {
  page?: number;
  pageSize?: number;
  variant_id?: string;
  event_type?: string;
  ref_type?: string;
  ref_id?: string;
}

export interface InboundLedgerResponse extends PaginationResponse<InboundLedgerEntry> {}

