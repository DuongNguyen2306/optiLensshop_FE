import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { getFinanceAnalytics } from "@/services/statistics.service";

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
function money(v: unknown): string {
  return `${Math.round(num(v)).toLocaleString("vi-VN")}đ`;
}
function pct(v: unknown): string {
  const n = num(v);
  return `${n.toFixed(1)}%`;
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

export default function FinanceAnalyticsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [draftStart, setDraftStart] = useState(initial.start);
  const [draftEnd, setDraftEnd] = useState(initial.end);
  const [appliedStart, setAppliedStart] = useState(initial.start);
  const [appliedEnd, setAppliedEnd] = useState(initial.end);

  const query = useQuery({
    queryKey: ["analytics", "finance", appliedStart, appliedEnd],
    queryFn: () =>
      getFinanceAnalytics({
        startDate: appliedStart ? new Date(appliedStart).toISOString() : undefined,
        endDate: appliedEnd ? new Date(appliedEnd).toISOString() : undefined,
      }),
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      const sc = statusCodeFromError(query.error);
      if (sc !== 401 && sc !== 403) {
        toast.error(getApiErrorMessage(query.error, "Không thể tải dữ liệu tài chính."));
      }
    }
  }, [query.isError, query.error]);

  const summary = query.data?.summary ?? {};
  const period = query.data?.period ?? {};
  const chartData = (query.data?.charts ?? []).map((c) => ({
    date: String(c.date ?? "—"),
    revenue: num(c.revenue),
    cashIn: num(c.cashIn),
  }));
  const topProducts = [...(query.data?.topProducts ?? [])].sort((a, b) => num(b.revenue) - num(a.revenue)).slice(0, 5);
  const paymentMethods = query.data?.breakdown?.paymentMethods ?? [];
  const orderTypes = query.data?.breakdown?.orderTypes ?? [];
  const statusCode = statusCodeFromError(query.error);

  if (query.isError && (statusCode === 401 || statusCode === 403)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Bạn không có quyền truy cập.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Phân tích tài chính theo thời gian.</p>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Từ ngày</Label>
          <Input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Đến ngày</Label>
          <Input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              setAppliedStart(draftStart);
              setAppliedEnd(draftEnd);
            }}
          >
            Apply
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
            Reset
          </Button>
        </div>
        <div className="flex items-end justify-end">
          <span className="text-xs text-slate-500">
            Group: <strong>{String(period.groupBy ?? "day")}</strong>
          </span>
        </div>
      </section>

      {query.isError && statusCode !== 401 && statusCode !== 403 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{getApiErrorMessage(query.error, "Không tải được dashboard tài chính.")}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tổng doanh thu</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{money(summary.totalRevenue)}</p>
            <p className="mt-1 text-xs text-slate-500">Gross raw: {money(summary.grossRevenueRaw)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Thực thu</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{money(summary.cashInHand)}</p>
            <p className="mt-1 text-xs text-slate-500">Refund: {money(summary.totalRefundAmount)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tiền đang treo</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{money(summary.receivables)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Lợi nhuận gộp</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{money(summary.totalProfit)}</p>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Revenue vs Cash In</h2>
        <div className="mt-4 h-[320px]">
          {query.isPending ? (
            <div className="h-full animate-pulse rounded-lg bg-slate-100" />
          ) : chartData.length === 0 ? (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">Không có dữ liệu chart.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(num(v) / 1000)}k`} />
                <Tooltip formatter={(v: number) => [money(v), ""]} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="cashIn" name="Cash In" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Top products</h2>
          {query.isPending ? (
            <div className="mt-3 h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Không có dữ liệu sản phẩm.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Product</th>
                    <th className="px-2 py-2 text-left">SKU</th>
                    <th className="px-2 py-2 text-left">Sold</th>
                    <th className="px-2 py-2 text-left">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((x, i) => (
                    <tr key={x.variant_id ?? i} className="border-b border-slate-100">
                      <td className="px-2 py-2">{x.name || "-"}</td>
                      <td className="px-2 py-2 font-mono text-xs">{x.sku || "-"}</td>
                      <td className="px-2 py-2">{num(x.sold)}</td>
                      <td className="px-2 py-2 font-semibold">{money(x.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Payment Methods</h3>
            {paymentMethods.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Không có dữ liệu.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {paymentMethods.map((x, i) => (
                  <div key={`${x.method ?? "m"}-${i}`}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{paymentMethodLabel(String(x.method ?? ""))}</span>
                      <span>{pct(x.percent)} · {money(x.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-100">
                      <div className="h-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, num(x.percent)))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Order Types</h3>
            {orderTypes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Không có dữ liệu.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {orderTypes.map((x, i) => (
                  <div key={`${x.orderType ?? "o"}-${i}`}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{orderTypeLabel(String(x.orderType ?? ""))}</span>
                      <span>{pct(x.percent)} · {money(x.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-100">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, num(x.percent)))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
