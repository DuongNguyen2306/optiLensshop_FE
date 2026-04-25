/** New state machine: PENDING → APPROVED → INSPECTING → REFUNDED | REJECTED
 *  Legacy values (RECEIVED, PROCESSING, COMPLETED) kept for backward-compat rendering.
 */
export type ReturnStatus =
  | "PENDING"
  | "APPROVED"
  | "INSPECTING"
  | "REFUNDED"
  | "REJECTED"
  // Legacy
  | "RECEIVED"
  | "PROCESSING"
  | "COMPLETED";

export type ConditionAtReceipt = "NEW" | "DAMAGED" | "USED";
export type ReasonCategory =
  | "damaged_on_arrival"
  | "wrong_item"
  | "changed_mind"
  | "defective"
  | "other";

export interface ReturnItemPayload {
  order_item_id: string;
  quantity: number;
}

export interface ReturnRequestCreatePayload {
  order_id: string;
  return_reason: string;
  reason_category: ReasonCategory;
  items: ReturnItemPayload[];
}

export interface ReturnHistoryEntry {
  action?: string;
  actor?: string;
  at?: string;
  note?: string;
}

export interface ReturnRequest {
  _id?: string;
  id?: string;
  order_id?: Record<string, unknown> | string;
  return_reason?: string;
  reason_category?: ReasonCategory | string;
  status?: ReturnStatus;
  items?: Array<{
    order_item_id?: string | Record<string, unknown>;
    quantity?: number;
    variant_id?: string | Record<string, unknown>;
    [key: string]: unknown;
  }>;
  condition_at_receipt?: ConditionAtReceipt;
  rejected_reason?: string;
  refund_amount?: number;
  is_restocked?: boolean;
  history_log?: ReturnHistoryEntry[];
  restockLog?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface MyReturnsQuery {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminReturnsQuery {
  status?: string;
  order_id?: string;
  condition?: string;
  page?: number;
  pageSize?: number;
}
