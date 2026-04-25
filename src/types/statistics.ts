export interface DateRangeQuery {
  start_date?: string;
  end_date?: string;
  /** Lọc thống kê theo loại đơn: `pre_order`, `stock` (đơn thường), hoặc bỏ trống = tất cả. */
  order_type?: string;
}

export interface StatisticsPaymentItem {
  method?: string;
  status?: string;
  count?: number;
  amount?: number;
}

export interface StatisticsOverviewResponse {
  period?: {
    start_date?: string;
    end_date?: string;
  };
  orders?: {
    total?: number;
    delivered?: number;
    completion_rate?: number;
    by_status?: Record<string, number>;
  };
  revenue?: {
    total?: number;
  };
  payments?: StatisticsPaymentItem[];
  [key: string]: unknown;
}

export interface StatisticsAdminResponse extends StatisticsOverviewResponse {
  users?: {
    active_customers?: number;
    new_customers_by_status?: Record<string, number>;
  };
  staff?: {
    by_role?: Record<string, number>;
  };
}

export interface StatisticsTimeseriesPoint {
  label?: string;
  revenue?: number;
  orders?: number;
}

export interface StatisticsTimeseriesResponse {
  group_by?: "day" | "week" | "month" | string;
  points?: StatisticsTimeseriesPoint[];
}

export interface StatisticsTopProductsItem {
  variant_id?: string;
  sku?: string;
  product_name?: string;
  product_type?: string;
  sold_quantity?: number;
  revenue?: number;
}

export interface StatisticsTopProductsResponse {
  items?: StatisticsTopProductsItem[];
}

export interface StatisticsInventoryAlertItem {
  variant_id?: string;
  sku?: string;
  product_name?: string;
  stock_quantity?: number;
  reserved_quantity?: number;
  available_quantity?: number;
  stock_type?: string;
}

export interface StatisticsInventoryAlertsResponse {
  total_alerts?: number;
  items?: StatisticsInventoryAlertItem[];
}

export interface StatisticsFunnelStep {
  status?: string;
  count?: number;
  ratio?: number;
}

export interface StatisticsFunnelResponse {
  total_orders?: number;
  steps?: StatisticsFunnelStep[];
}

export interface FinanceAnalyticsQuery {
  startDate?: string;
  endDate?: string;
}

export interface FinanceAnalyticsResponse {
  period?: {
    startDate?: string;
    endDate?: string;
    groupBy?: "day" | "month" | string;
  };
  summary?: {
    totalRevenue?: number;
    grossRevenueRaw?: number;
    totalRefundAmount?: number;
    totalProfit?: number;
    cashInHand?: number;
    receivables?: number;
  };
  charts?: Array<{
    date?: string;
    revenue?: number;
    cashIn?: number;
  }>;
  topProducts?: Array<{
    variant_id?: string;
    sku?: string | null;
    name?: string;
    revenue?: number;
    sold?: number;
  }>;
  breakdown?: {
    paymentMethods?: Array<{
      method?: string;
      amount?: number;
      percent?: number;
    }>;
    orderTypes?: Array<{
      orderType?: string;
      revenue?: number;
      percent?: number;
    }>;
  };
}
