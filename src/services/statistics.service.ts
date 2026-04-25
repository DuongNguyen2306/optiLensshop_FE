import axios from "@/lib/axios";
import type {
  DateRangeQuery,
  FinanceAnalyticsQuery,
  FinanceAnalyticsResponse,
  StatisticsAdminResponse,
  StatisticsFunnelResponse,
  StatisticsInventoryAlertsResponse,
  StatisticsOverviewResponse,
  StatisticsTimeseriesResponse,
  StatisticsTopProductsResponse,
} from "@/types/statistics";

function withDateRange(params?: DateRangeQuery): DateRangeQuery | undefined {
  if (!params) {
    return undefined;
  }
  const clean: DateRangeQuery = {};
  if (params.start_date?.trim()) {
    clean.start_date = params.start_date.trim();
  }
  if (params.end_date?.trim()) {
    clean.end_date = params.end_date.trim();
  }
  if (params.order_type?.trim()) {
    clean.order_type = params.order_type.trim();
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export async function getStatisticsOverview(params?: DateRangeQuery): Promise<StatisticsOverviewResponse> {
  const { data } = await axios.get<StatisticsOverviewResponse>("/statistics/overview", {
    params: withDateRange(params),
  });
  return data;
}

export async function getStatisticsAdmin(params?: DateRangeQuery): Promise<StatisticsAdminResponse> {
  const { data } = await axios.get<StatisticsAdminResponse>("/statistics/admin", {
    params: withDateRange(params),
  });
  return data;
}

export async function getStatisticsTimeseries(
  params?: DateRangeQuery & {
    group_by?: "day" | "week" | "month";
  }
): Promise<StatisticsTimeseriesResponse> {
  const query = {
    ...withDateRange(params),
    ...(params?.group_by ? { group_by: params.group_by } : {}),
  };
  const { data } = await axios.get<StatisticsTimeseriesResponse>("/statistics/timeseries", { params: query });
  return data;
}

export async function getStatisticsTopProducts(
  params?: DateRangeQuery & {
    limit?: number;
  }
): Promise<StatisticsTopProductsResponse> {
  const query = {
    ...withDateRange(params),
    ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
  };
  const { data } = await axios.get<StatisticsTopProductsResponse>("/statistics/top-products", { params: query });
  return data;
}

export async function getStatisticsInventoryAlerts(params?: {
  threshold?: number;
  limit?: number;
}): Promise<StatisticsInventoryAlertsResponse> {
  const query = {
    ...(typeof params?.threshold === "number" ? { threshold: params.threshold } : {}),
    ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
  };
  const { data } = await axios.get<StatisticsInventoryAlertsResponse>("/statistics/inventory-alerts", { params: query });
  return data;
}

export async function getStatisticsFunnel(params?: DateRangeQuery): Promise<StatisticsFunnelResponse> {
  const { data } = await axios.get<StatisticsFunnelResponse>("/statistics/funnel", {
    params: withDateRange(params),
  });
  return data;
}

export async function getFinanceAnalytics(params?: FinanceAnalyticsQuery): Promise<FinanceAnalyticsResponse> {
  const query: FinanceAnalyticsQuery = {};
  if (params?.startDate?.trim()) query.startDate = params.startDate.trim();
  if (params?.endDate?.trim()) query.endDate = params.endDate.trim();
  const { data } = await axios.get<FinanceAnalyticsResponse>("/api/admin/analytics/finance", {
    params: Object.keys(query).length > 0 ? query : undefined,
  });
  return data;
}
