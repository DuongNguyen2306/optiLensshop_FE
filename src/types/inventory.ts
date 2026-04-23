export interface InventoryReceipt {
  _id?: string;
  id?: string;
  variant_id?: string | Record<string, unknown>;
  qty_in?: number;
  unit_cost?: number;
  supplier_name?: string;
  note?: string;
  status?: "draft" | "confirmed" | "cancelled" | string;
  created_at?: string;
  confirmed_at?: string;
  [key: string]: unknown;
}

export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface InventoryReceiptsQuery {
  page?: number;
  limit?: number;
  status?: string;
  variant_id?: string;
}

export interface InventoryReceiptsListResponse {
  items: InventoryReceipt[];
  pagination: InventoryPagination;
}

export interface InventoryLedgerEntry {
  _id?: string;
  id?: string;
  variant_id?: string | Record<string, unknown>;
  event_type?: string;
  quantity_delta?: number;
  stock_before?: number;
  stock_after?: number;
  reserved_before?: number;
  reserved_after?: number;
  ref_type?: string | null;
  ref_id?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface InventoryLedgerQuery {
  page?: number;
  limit?: number;
  variant_id?: string;
  event_type?: string;
}

export interface InventoryLedgerListResponse {
  items: InventoryLedgerEntry[];
  pagination: InventoryPagination;
}

export interface CreateInventoryReceiptBody {
  variant_id: string;
  qty_in: number;
  unit_cost: number;
  supplier_name?: string;
  note?: string;
}
