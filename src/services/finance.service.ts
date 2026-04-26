import axios from "@/lib/axios";
import { parseFinanceDateQueryForAdmin, parseFinanceDateQueryForSummary } from "@/lib/finance-date";
import type {
  FinanceAnalyticsQuery,
  FinanceAnalyticsResponse,
  FinanceSummaryResponse,
  InventoryReconciliationResponse,
} from "@/types/finance";

export async function getFinanceSummary(
  startInput: string,
  endInput: string
): Promise<FinanceSummaryResponse> {
  const params = parseFinanceDateQueryForSummary(startInput, endInput);
  const { data } = await axios.get<FinanceSummaryResponse>("/finance/summary", {
    params: params ?? undefined,
  });
  return data;
}

export async function getInventoryFinanceReconciliation(
  startInput: string,
  endInput: string
): Promise<InventoryReconciliationResponse> {
  const params = parseFinanceDateQueryForSummary(startInput, endInput);
  const { data } = await axios.get<InventoryReconciliationResponse>("/finance/reconciliation/inventory", {
    params: params ?? undefined,
  });
  return data;
}

export async function getFinanceAnalytics(params?: FinanceAnalyticsQuery): Promise<FinanceAnalyticsResponse> {
  const query: Record<string, string> = {};
  if (params?.startDate?.trim()) query.startDate = params.startDate.trim();
  if (params?.endDate?.trim()) query.endDate = params.endDate.trim();
  const { data } = await axios.get<FinanceAnalyticsResponse>("/api/admin/analytics/finance", {
    params: Object.keys(query).length > 0 ? query : undefined,
  });
  return data;
}
