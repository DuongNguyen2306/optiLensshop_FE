import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatFinancePeriodVi, flattenNotesForDisplay, orderOrPaymentLabelVi } from "@/lib/finance-display";
import { formatCurrency } from "@/lib/formatCurrency";
import { dateInputsToIsoRange, parseFinanceDateQueryForAdmin } from "@/lib/finance-date";
import { normalizeRole } from "@/lib/role-routing";
import { getFinanceAnalytics, getFinanceSummary, getInventoryFinanceReconciliation } from "@/services/finance.service";
import { useAppSelector } from "@/store/hooks";
import type { FinanceReconciliation, FinanceDataQualityFlags } from "@/types/finance";
import { CompositionHorizontalBars } from "@/components/finance/CompositionHorizontalBars";
import { FinanceKpiRow, type FinanceKpiItem } from "@/components/finance/FinanceKpiRow";
import { FinanceRevenueBarsCard } from "@/components/finance/FinanceRevenueBarsCard";
import { InboundValueSplitCard } from "@/components/finance/InboundValueSplitCard";
import { normalizePaymentRows, PaymentMethodsPanel } from "@/components/finance/PaymentMethodsPanel";
import { PnlWaterfallCard } from "@/components/finance/PnlWaterfallCard";
import { RecentInboundReceiptsCard } from "@/components/finance/RecentInboundReceiptsCard";
import { ReconciliationBlock } from "@/components/finance/ReconciliationBlock";
import { TopProductsBar } from "@/components/finance/TopProductsBar";

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: dateInputValue(start), end: dateInputValue(end) };
}
function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "momo") return "MoMo";
  if (m === "vnpay") return "VNPay";
  if (m === "cod") return "COD";
  return method || "Khác";
}
function orderTypeLabel(t: string): string {
  const x = t.toLowerCase();
  if (x === "stock") return "Hàng sẵn";
  if (x === "pre_order") return "Pre-order";
  if (x === "prescription") return "Đơn kính thuốc";
  return t || "Khác";
}
function statusCodeFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const rec = error as Record<string, unknown>;
  const response = rec.response;
  if (!response || typeof response !== "object") return null;
  const status = (response as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
}

function mergeFlags(
  a: FinanceDataQualityFlags | undefined,
  b: FinanceDataQualityFlags | undefined
): { missing: number; legacy: number } {
  const m1 = num(a?.variant_count_missing_unit_cost);
  const m2 = num(b?.variant_count_missing_unit_cost);
  const l1 = num(a?.cost_sourced_from_legacy_inbound);
  const l2 = num(b?.cost_sourced_from_legacy_inbound);
  return {
    missing: Math.max(m1, m2, 0),
    legacy: Math.max(l1, l2, 0),
  };
}

function revenueHalfPeriodTrend(points: Array<{ revenue: number }>): string | undefined {
  if (points.length < 4) return undefined;
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid).reduce((s, p) => s + p.revenue, 0);
  const second = points.slice(mid).reduce((s, p) => s + p.revenue, 0);
  if (first <= 0 && second <= 0) return undefined;
  if (first <= 0) return `Nửa sau kỳ: ${formatCurrency(second)}`;
  const pct = ((second - first) / first) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% doanh thu nửa sau so với nửa đầu kỳ`;
}

function cashInFromSummary(summary: Record<string, unknown> | undefined, adminCashInHand: unknown): number {
  const raw = summary?.cash_in_from_payments;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const x = Number(raw);
    if (Number.isFinite(x)) return x;
  }
  return num(adminCashInHand);
}

function exportFinanceCsv(appliedStart: string, appliedEnd: string, rows: { label: string; value: number }[]) {
  const bom = "\uFEFF";
  const all: string[][] = [["Chỉ số", "Giá trị (VND)"], ["Kỳ", `${appliedStart} → ${appliedEnd}`], ...rows.map((r) => [r.label, String(Math.round(r.value))])];
  const body = all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tai-chinh-${appliedStart}-${appliedEnd}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceAnalyticsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [draftStart, setDraftStart] = useState(initial.start);
  const [draftEnd, setDraftEnd] = useState(initial.end);
  const [appliedStart, setAppliedStart] = useState(initial.start);
  const [appliedEnd, setAppliedEnd] = useState(initial.end);

  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");
  const isAdmin = role === "admin";
  const rangeValid = useMemo(() => dateInputsToIsoRange(appliedStart, appliedEnd), [appliedStart, appliedEnd]);

  const summaryQuery = useQuery({
    queryKey: ["finance", "summary", appliedStart, appliedEnd],
    queryFn: () => getFinanceSummary(appliedStart, appliedEnd),
    enabled: rangeValid != null,
    retry: false,
  });

  const adminQuery = useQuery({
    queryKey: ["finance", "admin", "analytics", appliedStart, appliedEnd],
    queryFn: () => {
      const p = parseFinanceDateQueryForAdmin(appliedStart, appliedEnd);
      if (!p) throw new Error("Kỳ không hợp lệ");
      return getFinanceAnalytics({ startDate: p.startDate, endDate: p.endDate });
    },
    enabled: isAdmin && rangeValid != null,
    retry: false,
  });

  const reconQuery = useQuery({
    queryKey: ["finance", "reconciliation", "inventory", appliedStart, appliedEnd],
    queryFn: () => getInventoryFinanceReconciliation(appliedStart, appliedEnd),
    enabled: rangeValid != null,
    retry: false,
  });

  useEffect(() => {
    const err = summaryQuery.isError ? summaryQuery.error : adminQuery.isError ? adminQuery.error : null;
    if (!err) return;
    const sc = statusCodeFromError(err);
    if (sc !== 401 && sc !== 403) {
      toast.error(getApiErrorMessage(err, "Không thể tải dữ liệu tài chính."));
    }
  }, [summaryQuery.isError, summaryQuery.error, adminQuery.isError, adminQuery.error]);

  const adminData = adminQuery.data;
  const summaryData = summaryQuery.data;
  const accrual = summaryData?.accrual;
  const notesAccrual =
    typeof summaryData?.notes === "object" && summaryData.notes && "accrual" in summaryData.notes
      ? String((summaryData.notes as Record<string, unknown>).accrual ?? "")
      : "";

  const flags = mergeFlags(
    summaryData?.data_quality_flags,
    isAdmin ? adminData?.data_quality_flags : undefined
  );

  const summaryBlock = adminData?.summary;
  const reconFromAdmin: FinanceReconciliation | undefined = adminData?.reconciliation;
  const reconFromApi = reconQuery.data;
  const reconciliation: FinanceReconciliation | undefined = reconFromAdmin ?? reconFromApi;
  const reconciliationSource: "admin" | "dedicated" | null = reconFromAdmin
    ? "admin"
    : reconFromApi
      ? "dedicated"
      : null;

  const period = adminData?.period ?? {};
  const chartData = (adminData?.charts ?? []).map((c) => ({
    date: String(c.date ?? "—"),
    revenue: num(c.revenue),
    cashIn: num(c.cashIn),
  }));
  const topProducts = [...(adminData?.topProducts ?? [])].sort((a, b) => num(b.revenue) - num(a.revenue)).slice(0, 5);
  const paymentMethods = adminData?.breakdown?.paymentMethods ?? [];
  const orderTypes = adminData?.breakdown?.orderTypes ?? [];
  const summaryErrCode = statusCodeFromError(summaryQuery.error);
  const adminErrCode = statusCodeFromError(adminQuery.error);

  const revenueByStatus = summaryData?.revenue_by_order_status;
  const ordersByStatus = summaryData?.orders_in_period_by_status;
  const summaryRec = (summaryData ?? {}) as Record<string, unknown>;
  const refundsField = summaryRec.refunds;

  const payFmt = useCallback((s: string) => paymentMethodLabel(s), []);
  const typeFmt = useCallback((s: string) => orderTypeLabel(s), []);
  const paymentRaw = useMemo(() => (paymentMethods as Array<Record<string, unknown>>), [paymentMethods]);
  const orderTypeRaw = useMemo(() => (orderTypes as Array<Record<string, unknown>>), [orderTypes]);

  const revenueTrendFooter = useMemo(() => {
    if (!isAdmin || chartData.length < 4) return undefined;
    return revenueHalfPeriodTrend(chartData);
  }, [isAdmin, chartData]);

  const kpiItems = useMemo((): [FinanceKpiItem, FinanceKpiItem, FinanceKpiItem, FinanceKpiItem] => {
    const sumRec = summaryData as Record<string, unknown> | undefined;
    const cash = cashInFromSummary(sumRec, summaryBlock?.cashInHand);
    const trend = revenueTrendFooter;
    const trendTone: FinanceKpiItem["footerTone"] =
      trend == null ? undefined : trend.trim().startsWith("-") ? "negative" : trend.includes("+") ? "positive" : "neutral";

    if (accrual) {
      return [
        { label: "Doanh thu thuần", value: accrual.revenue_net, variant: "revenue", footer: trend, footerTone: trendTone },
        { label: "Giá vốn (COGS)", value: accrual.cogs, variant: "cost" },
        { label: "Lợi nhuận gộp", value: accrual.gross_profit, variant: "profit" },
        { label: "Thực thu (dòng tiền)", value: cash, variant: "cashflow" },
      ];
    }
    if (summaryBlock) {
      return [
        { label: "Doanh thu thuần", value: summaryBlock.revenue_net, variant: "revenue", footer: trend, footerTone: trendTone },
        { label: "Giá vốn (COGS)", value: summaryBlock.cogs, variant: "cost" },
        { label: "Lợi nhuận gộp", value: summaryBlock.gross_profit, variant: "profit" },
        { label: "Thực thu (dòng tiền)", value: cash, variant: "cashflow" },
      ];
    }
    return [
      { label: "Doanh thu ước tính", value: summaryData?.estimated_net ?? 0, variant: "revenue", footer: trend, footerTone: trendTone },
      { label: "Giá vốn (COGS)", value: 0, variant: "cost" },
      { label: "Lợi nhuận gộp", value: 0, variant: "profit" },
      { label: "Thực thu (dòng tiền)", value: cash, variant: "cashflow" },
    ];
  }, [accrual, summaryBlock, summaryData, revenueTrendFooter]);

  const paymentDisplayRows = useMemo(() => normalizePaymentRows(paymentRaw, payFmt), [paymentRaw, payFmt]);

  const handleExportCsv = useCallback(() => {
    exportFinanceCsv(appliedStart, appliedEnd, [
      { label: kpiItems[0].label, value: num(kpiItems[0].value) },
      { label: kpiItems[1].label, value: num(kpiItems[1].value) },
      { label: kpiItems[2].label, value: num(kpiItems[2].value) },
      { label: kpiItems[3].label, value: num(kpiItems[3].value) },
    ]);
    toast.success("Đã tải file CSV.");
  }, [appliedStart, appliedEnd, kpiItems]);

  if (summaryQuery.isError && (summaryErrCode === 401 || summaryErrCode === 403)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Bạn không có quyền truy cập tổng quan tài chính.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tài chính & P&amp;L (accrual)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tổng quan theo kỳ, cảnh báo chất lượng dữ liệu giá vốn, và (Admin) biểu đồ cùng đối soát kho.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-4">
          <div className="min-w-[140px] space-y-1">
            <Label>Từ ngày</Label>
            <Input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
          </div>
          <div className="min-w-[140px] space-y-1">
            <Label>Đến ngày</Label>
            <Input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                if (!dateInputsToIsoRange(draftStart, draftEnd)) {
                  toast.error("Chọn kỳ hợp lệ (từ ≤ đến).");
                  return;
                }
                setAppliedStart(draftStart);
                setAppliedEnd(draftEnd);
              }}
            >
              Áp dụng
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const d = defaultRange();
                setDraftStart(d.start);
                setDraftEnd(d.end);
                setAppliedStart(d.start);
                setAppliedEnd(d.end);
              }}
            >
              Đặt lại
            </Button>
          </div>
          {isAdmin ? (
            <p className="text-xs text-slate-500 lg:ml-2">
              Gom nhóm biểu đồ: <span className="font-medium text-slate-700">{String(period.groupBy ?? "day")}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500">Tổng quan theo kỳ + đối soát kho</p>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
          <Button type="button" variant="outline" className="gap-2 border-slate-200" onClick={handleExportCsv} disabled={summaryQuery.isPending}>
            <Download className="size-4" aria-hidden />
            Xuất CSV
          </Button>
        </div>
      </section>

      {summaryQuery.isError && summaryErrCode !== 401 && summaryErrCode !== 403 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {getApiErrorMessage(summaryQuery.error, "Không tải được tổng quan tài chính (/finance/summary).")}
          </p>
        </div>
      ) : null}

      {isAdmin && adminQuery.isError && adminErrCode !== 401 && adminErrCode !== 403 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getApiErrorMessage(adminQuery.error, "Không tải dashboard admin (charts có thể thiếu).")}
        </div>
      ) : null}

      {summaryQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : !summaryQuery.isError ? (
        <>
          <FinanceKpiRow
            rows={kpiItems}
            dataQuality={{ missing: flags.missing, legacy: flags.legacy }}
            className="!space-y-4"
          />
          {accrual && num(accrual.operating_expenses) > 0 ? (
            <div className="rounded-2xl border border-purple-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase text-purple-800/90">Chi phí vận hành</span>
              <span className="ml-2 font-bold tabular-nums text-slate-900">{formatCurrency(accrual.operating_expenses)}</span>
            </div>
          ) : null}

          {isAdmin && !adminQuery.isError ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-10 lg:items-stretch">
                <div className="min-h-[320px] lg:col-span-7">
                  <FinanceRevenueBarsCard data={chartData} isPending={adminQuery.isPending} className="h-full min-h-[320px]" />
                </div>
                <div className="min-h-[280px] lg:col-span-3">
                  <PaymentMethodsPanel rows={paymentDisplayRows} isPending={adminQuery.isPending} className="h-full" />
                </div>
              </div>
              <RecentInboundReceiptsCard enabled={isAdmin} />
            </div>
          ) : null}

          <div
            className={
              accrual && (num(accrual.purchase_inbound_value) > 0 || num(accrual.return_restock_inbound_value) > 0)
                ? "grid gap-6 lg:grid-cols-2"
                : "space-y-6"
            }
          >
            <PnlWaterfallCard accrual={accrual} refunds={refundsField} />
            {accrual && (num(accrual.purchase_inbound_value) > 0 || num(accrual.return_restock_inbound_value) > 0) ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <InboundValueSplitCard accrual={accrual} />
              </div>
            ) : null}
          </div>
          {notesAccrual ? (
            <details className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
              <summary className="cursor-pointer font-medium text-slate-800">Cách tính (accrual)</summary>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">{notesAccrual}</p>
            </details>
          ) : null}

          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Chi tiết bổ sung</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium text-slate-500">Kỳ báo cáo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatFinancePeriodVi(summaryData?.period)}</p>
                </CardContent>
              </Card>
              {summaryData?.estimated_net != null ? (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs font-medium text-slate-500">Doanh thu ước tính (tổng quan)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(summaryData.estimated_net)}</p>
                  </CardContent>
                </Card>
              ) : null}
              {"cash_in_from_payments" in (summaryData ?? {}) ? (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs font-medium text-slate-500">Thực thu từ thanh toán</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                      {typeof (summaryData as Record<string, unknown>)?.cash_in_from_payments === "number"
                        ? formatCurrency((summaryData as Record<string, unknown>).cash_in_from_payments)
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              {"refunds" in (summaryData ?? {}) ? (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs font-medium text-slate-500">Hoàn tiền trong kỳ</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                      {typeof (summaryData as Record<string, unknown>)?.refunds === "number"
                        ? formatCurrency((summaryData as Record<string, unknown>).refunds)
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              {"expenses" in (summaryData ?? {}) ? (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs font-medium text-slate-500">Chi phí trong kỳ</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                      {typeof (summaryData as Record<string, unknown>)?.expenses === "number"
                        ? formatCurrency((summaryData as Record<string, unknown>).expenses)
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
            {revenueByStatus && typeof revenueByStatus === "object" && !Array.isArray(revenueByStatus) ? (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doanh thu theo trạng thái đơn</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {Object.entries(revenueByStatus as Record<string, unknown>).map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-700">{orderOrPaymentLabelVi(k)}</span>
                        <span className="tabular-nums font-semibold text-slate-900">{formatCurrency(v)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
            {ordersByStatus && typeof ordersByStatus === "object" && !Array.isArray(ordersByStatus) ? (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số đơn theo trạng thái</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {Object.entries(ordersByStatus as Record<string, unknown>).map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-700">{orderOrPaymentLabelVi(k)}</span>
                        <span className="tabular-nums font-semibold text-slate-900">{Number(v).toLocaleString("vi-VN")}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </section>
        </>
      ) : null}

      {reconciliation && reconciliationSource ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
          <p className="mb-3 text-xs text-slate-500">
            Dữ liệu đối soát: {reconciliationSource === "admin" ? "báo cáo admin" : "hệ thống kho"}
          </p>
          <ReconciliationBlock reconciliation={reconciliation} />
          {reconQuery.data?.notes != null && reconciliationSource === "dedicated" && (
            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer text-slate-800">Ghi chú cách tính (đối soát)</summary>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">{flattenNotesForDisplay(reconQuery.data.notes)}</p>
            </details>
          )}
        </div>
      ) : reconQuery.isError && !reconFromAdmin ? (
        <p className="text-sm text-slate-500">Không tải được đối soát kho (endpoint tùy chọn).</p>
      ) : null}

      {isAdmin && !adminQuery.isError && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Top sản phẩm theo doanh thu</h2>
            {adminQuery.isPending ? (
              <div className="mt-2 h-64 animate-pulse rounded-lg bg-slate-100" />
            ) : topProducts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Không có dữ liệu sản phẩm.</p>
            ) : (
              <TopProductsBar className="mt-2" items={topProducts} />
            )}
          </section>
          <div className="space-y-4">
            {orderTypeRaw.length > 0 ? (
              <CompositionHorizontalBars
                title="Cấu thành: loại đơn"
                color="hsl(250 50% 52%)"
                raw={orderTypeRaw}
                valueKey="revenue"
                nameKey="orderType"
                nameFormatter={typeFmt}
              />
            ) : !adminQuery.isPending ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu phân loại đơn trong kỳ.</p>
            ) : null}
          </div>
        </div>
      )}

      {!isAdmin && rangeValid && (
        <p className="text-sm text-slate-500">Biểu đồ và bảng top sản phẩm theo dữ liệu admin chỉ hiển thị với tài khoản Admin.</p>
      )}
    </div>
  );
}
