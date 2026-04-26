/**
 * Finance & accrual / P&L — map đúng key từ BE, không tự bịa tên.
 */

export interface FinanceAccrual {
  revenue_gross?: number;
  revenue_net?: number;
  cogs?: number;
  gross_profit?: number;
  operating_expenses?: number;
  net_operating_profit?: number;
  purchase_inbound_value?: number;
  return_restock_inbound_value?: number;
  [key: string]: unknown;
}

export interface FinanceDataQualityFlags {
  /** Số variant (không trùng) bán trong kỳ mà không có unit cost. */
  variant_count_missing_unit_cost?: number;
  /** Số dòng/variant mà cost fallback từ StockInbound legacy. */
  cost_sourced_from_legacy_inbound?: number;
  [key: string]: unknown;
}

/** GET /finance/summary */
export interface FinanceSummaryResponse {
  period?: Record<string, unknown>;
  notes?: {
    accrual?: string;
    [key: string]: unknown;
  };
  revenue_by_order_status?: Record<string, number> | unknown;
  cash_in_from_payments?: unknown;
  refunds?: unknown;
  expenses?: unknown;
  estimated_net?: number;
  orders_in_period_by_status?: Record<string, number> | unknown;
  accrual?: FinanceAccrual;
  data_quality_flags?: FinanceDataQualityFlags;
  [key: string]: unknown;
}

export interface FinanceReconciliation {
  inbound_receipts_qty?: number;
  ledger_inbound_events_qty?: number;
  delta?: number;
  in_sync?: boolean;
  [key: string]: unknown;
}

/** GET /finance/reconciliation/inventory */
export interface InventoryReconciliationResponse {
  period?: Record<string, unknown>;
  notes?: string | Record<string, unknown>;
  inbound_receipts_qty?: number;
  ledger_inbound_events_qty?: number;
  delta?: number;
  in_sync?: boolean;
  [key: string]: unknown;
}

export interface FinanceAnalyticsQuery {
  startDate?: string;
  endDate?: string;
}

/** GET /api/admin/analytics/finance — giữ key cũ + mở rộng từ BE. */
export interface AdminFinanceSummaryBlock {
  totalRevenue?: number;
  grossRevenueRaw?: number;
  totalRefundAmount?: number;
  totalProfit?: number;
  cashInHand?: number;
  receivables?: number;
  revenue_net?: number;
  cogs?: number;
  gross_profit?: number;
  operating_expenses?: number;
  net_operating_profit?: number;
  purchase_inbound_value?: number;
  return_restock_inbound_value?: number;
  [key: string]: unknown;
}

export interface FinanceAnalyticsResponse {
  period?: {
    startDate?: string;
    endDate?: string;
    start_date?: string;
    end_date?: string;
    groupBy?: "day" | "month" | string;
  };
  summary?: AdminFinanceSummaryBlock;
  data_quality_flags?: FinanceDataQualityFlags;
  reconciliation?: FinanceReconciliation;
  charts?: Array<{
    date?: string;
    revenue?: number;
    cashIn?: number;
    [key: string]: unknown;
  }>;
  topProducts?: Array<{
    variant_id?: string;
    sku?: string | null;
    name?: string;
    revenue?: number;
    sold?: number;
    [key: string]: unknown;
  }>;
  breakdown?: {
    paymentMethods?: Array<{
      method?: string;
      amount?: number;
      percent?: number;
      [key: string]: unknown;
    }>;
    orderTypes?: Array<{
      orderType?: string;
      revenue?: number;
      percent?: number;
      [key: string]: unknown;
    }>;
  };
  [key: string]: unknown;
}
