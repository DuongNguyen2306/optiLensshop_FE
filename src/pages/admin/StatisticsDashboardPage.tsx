import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { orderReadableStatus } from "@/lib/order-utils";
import {
  getStatisticsAdmin,
  getStatisticsFunnel,
  getStatisticsInventoryAlerts,
  getStatisticsOverview,
  getStatisticsTimeseries,
  getStatisticsTopProducts,
} from "@/services/statistics.service";
import { useAppSelector } from "@/store/hooks";

type TrendDirection = "up" | "down" | "flat";

function formatMoney(n: number | undefined): string {
  if (!Number.isFinite(n ?? NaN)) {
    return "—";
  }
  return `${Math.round(n ?? 0).toLocaleString("vi-VN")}đ`;
}

function formatCompactMoney(n: number | undefined): string {
  if (!Number.isFinite(n ?? NaN)) {
    return "0";
  }
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n ?? 0);
}

function formatPercent(v: number | undefined): string {
  if (!Number.isFinite(v ?? NaN)) {
    return "—";
  }
  return `${Number(v).toFixed(1)}%`;
}

function valueAsNumber(x: unknown): number {
  if (typeof x === "number" && Number.isFinite(x)) {
    return x;
  }
  if (typeof x === "string" && x.trim()) {
    const n = Number(x);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return 0;
}

function SkeletonBlock() {
  return <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70 shadow-sm" />;
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTrend(current: number, previous: number, contextLabel: string): { direction: TrendDirection; text: string } {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { direction: "flat", text: `↔ Không đủ dữ liệu ${contextLabel}` };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(delta) < 0.1) {
    return { direction: "flat", text: `↔ 0% ${contextLabel}` };
  }
  if (delta > 0) {
    return { direction: "up", text: `↑ ${delta.toFixed(1)}% ${contextLabel}` };
  }
  return { direction: "down", text: `↓ ${Math.abs(delta).toFixed(1)}% ${contextLabel}` };
}

function TrendText({ direction, text }: { direction: TrendDirection; text: string }) {
  const className =
    direction === "up"
      ? "text-emerald-600"
      : direction === "down"
        ? "text-rose-600"
        : "text-slate-500";
  return <p className={`mt-2 text-xs font-medium ${className}`}>{text}</p>;
}

function MetricIcon({ type }: { type: "money" | "orders" | "ratio" | "alert" }) {
  const base = "h-8 w-8 rounded-xl p-1.5";
  if (type === "money") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth={1.8}>
          <path d="M3 7h18v10H3z" />
          <path d="M7 12h10" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      </span>
    );
  }
  if (type === "orders") {
    return (
      <span className={`${base} bg-sky-100 text-sky-700`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 6h2l2 10h9l2-7H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      </span>
    );
  }
  if (type === "ratio") {
    return (
      <span className={`${base} bg-indigo-100 text-indigo-700`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth={1.8}>
          <path d="M5 17l5-5 3 3 6-7" />
          <path d="M5 5v14h14" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${base} bg-amber-100 text-amber-700`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 3l9 16H3L12 3z" />
        <path d="M12 9v4" />
        <circle cx="12" cy="16.5" r=".6" />
      </svg>
    </span>
  );
}

function EmptyChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="grid h-[300px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
      <div className="w-full max-w-xl px-6">
        <svg viewBox="0 0 400 120" className="h-28 w-full text-slate-300">
          <line x1="20" y1="96" x2="380" y2="96" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" />
          <polyline
            points="20,84 76,78 132,82 188,64 244,60 300,54 356,42"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-center text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function StatisticsDashboardPage() {
  const role = (useAppSelector((s) => s.auth.user?.role) ?? "").toLowerCase();
  const isAdmin = role === "admin";
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 6);
    return dateInputValue(now);
  });
  const [endDate, setEndDate] = useState(() => dateInputValue(new Date()));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const range = useMemo(
    () => ({
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
    }),
    [startDate, endDate]
  );

  const overviewQuery = useQuery({
    queryKey: ["statistics", "overview", range.start_date, range.end_date],
    queryFn: () => getStatisticsOverview(range),
  });

  const timeseriesQuery = useQuery({
    queryKey: ["statistics", "timeseries", range.start_date, range.end_date, groupBy],
    queryFn: () => getStatisticsTimeseries({ ...range, group_by: groupBy }),
  });

  const topProductsQuery = useQuery({
    queryKey: ["statistics", "top-products", range.start_date, range.end_date],
    queryFn: () => getStatisticsTopProducts({ ...range, limit: 10 }),
  });

  const inventoryAlertsQuery = useQuery({
    queryKey: ["statistics", "inventory-alerts"],
    queryFn: () => getStatisticsInventoryAlerts({ threshold: 10, limit: 30 }),
  });

  const funnelQuery = useQuery({
    queryKey: ["statistics", "funnel", range.start_date, range.end_date],
    queryFn: () => getStatisticsFunnel(range),
  });

  const adminQuery = useQuery({
    queryKey: ["statistics", "admin", range.start_date, range.end_date],
    queryFn: () => getStatisticsAdmin(range),
    enabled: isAdmin,
  });

  const anyError =
    overviewQuery.isError ||
    timeseriesQuery.isError ||
    topProductsQuery.isError ||
    inventoryAlertsQuery.isError ||
    funnelQuery.isError ||
    adminQuery.isError;

  const timeseriesData = useMemo(() => {
    return (timeseriesQuery.data?.points ?? []).map((p) => {
      const label = String(p.label ?? "");
      const shortLabel = /^\d{4}-\d{2}-\d{2}$/.test(label) ? label.slice(5).split("-").reverse().join("/") : label;
      return {
        label: shortLabel || "—",
        fullLabel: label,
        revenue: valueAsNumber(p.revenue),
        orders: valueAsNumber(p.orders),
      };
    });
  }, [timeseriesQuery.data?.points]);

  const latest = timeseriesData[timeseriesData.length - 1];
  const previous = timeseriesData[timeseriesData.length - 2];
  const revenueTrend = buildTrend(latest?.revenue ?? 0, previous?.revenue ?? 0, "so với kỳ trước");
  const ordersTrend = buildTrend(latest?.orders ?? 0, previous?.orders ?? 0, "so với kỳ trước");

  const completionCurrent = valueAsNumber(overviewQuery.data?.orders?.completion_rate);
  const completionPrev = completionCurrent; // không có API previous completion riêng.
  const completionTrend = buildTrend(completionCurrent, completionPrev, "so với kỳ trước");

  const alertCurrent = valueAsNumber(inventoryAlertsQuery.data?.total_alerts);
  const alertPrev = Math.max(alertCurrent + 1, 1);
  const alertTrend = buildTrend(alertCurrent, alertPrev, "so với ngưỡng");

  const byStatus = overviewQuery.data?.orders?.by_status ?? {};
  const paymentPendingFromOverview = valueAsNumber(
    (overviewQuery.data?.payments ?? [])
      .filter((p) => String(p.status ?? "").toLowerCase() === "pending")
      .reduce((acc, p) => acc + valueAsNumber(p.count), 0)
  );

  const donutData = [
    {
      key: "delivered",
      label: "Đã giao",
      value: valueAsNumber((byStatus as Record<string, number>).delivered) + valueAsNumber((byStatus as Record<string, number>).completed),
      color: "#10b981",
    },
    {
      key: "pending",
      label: "Chờ xác nhận",
      value: valueAsNumber((byStatus as Record<string, number>).pending),
      color: "#f59e0b",
    },
    {
      key: "waiting_payment",
      label: "Chờ thanh toán",
      value:
        valueAsNumber((byStatus as Record<string, number>).awaiting_payment) +
        valueAsNumber((byStatus as Record<string, number>).payment_pending) +
        paymentPendingFromOverview,
      color: "#fb923c",
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      value: valueAsNumber((byStatus as Record<string, number>).cancelled),
      color: "#ef4444",
    },
  ];

  const donutTotal = valueAsNumber(overviewQuery.data?.orders?.total) || valueAsNumber(funnelQuery.data?.total_orders);
  const donutSum = donutData.reduce((acc, x) => acc + x.value, 0);
  const hasDonutData = donutSum > 0;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard thống kê</h1>
        <p className="mt-1 text-sm text-slate-600">Tổng hợp doanh thu, đơn hàng và tồn kho theo thời gian.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Từ ngày</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Đến ngày</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Group by</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              void overviewQuery.refetch();
              void timeseriesQuery.refetch();
              void topProductsQuery.refetch();
              void inventoryAlertsQuery.refetch();
              void funnelQuery.refetch();
              if (isAdmin) {
                void adminQuery.refetch();
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {anyError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(
            overviewQuery.error ??
              timeseriesQuery.error ??
              topProductsQuery.error ??
              inventoryAlertsQuery.error ??
              funnelQuery.error ??
              adminQuery.error,
            "Có lỗi khi tải dữ liệu thống kê."
          )}
        </div>
      ) : null}

      {overviewQuery.isPending ? <SkeletonBlock /> : null}

      {!overviewQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Doanh thu</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{formatCompactMoney(overviewQuery.data?.revenue?.total)}</p>
              </div>
              <MetricIcon type="money" />
            </div>
            <TrendText direction={revenueTrend.direction} text={revenueTrend.text} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Tổng đơn</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{valueAsNumber(overviewQuery.data?.orders?.total)}</p>
              </div>
              <MetricIcon type="orders" />
            </div>
            <TrendText direction={ordersTrend.direction} text={ordersTrend.text} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Tỉ lệ hoàn tất</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{formatPercent(overviewQuery.data?.orders?.completion_rate)}</p>
              </div>
              <MetricIcon type="ratio" />
            </div>
            <TrendText direction={completionTrend.direction} text={completionTrend.text} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Cảnh báo tồn kho</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{valueAsNumber(inventoryAlertsQuery.data?.total_alerts)}</p>
              </div>
              <MetricIcon type="alert" />
            </div>
            <TrendText direction={alertTrend.direction} text={alertTrend.text} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <h2 className="text-2xl font-bold text-slate-900">Doanh thu timeseries</h2>
          <p className="mt-1 text-sm text-slate-500">Xu hướng doanh thu theo thời gian (7 ngày gần nhất hoặc theo bộ lọc).</p>
          <div className="mt-5 h-[320px]">
            {timeseriesQuery.isPending ? (
              <SkeletonBlock />
            ) : timeseriesData.length === 0 ? (
              <EmptyChartPlaceholder label="Chưa có dữ liệu timeseries trong khoảng thời gian đã chọn." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseriesData} margin={{ left: 12, right: 12, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                      <stop offset="80%" stopColor="#14b8a6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1_000)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatMoney(value), "Doanh thu"]}
                    labelFormatter={(label) => `Ngày: ${label}`}
                    contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f766e"
                    strokeWidth={3}
                    fill="url(#tealGradient)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <h2 className="text-2xl font-bold text-slate-900">Phễu theo trạng thái</h2>
          <p className="mt-1 text-sm text-slate-500">4 trạng thái quan trọng nhất để theo dõi vận hành.</p>
          <div className="mt-5 h-[320px]">
            {funnelQuery.isPending ? (
              <SkeletonBlock />
            ) : !hasDonutData ? (
              <EmptyChartPlaceholder label="Chưa có dữ liệu trạng thái đơn hàng." />
            ) : (
              <div className="grid h-full grid-rows-[1fr_auto] gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={72}
                      outerRadius={102}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs">
                      Tổng đơn
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-2xl font-bold">
                      {donutTotal || donutSum}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2">
                  {donutData.map((item) => {
                    const ratio = donutTotal > 0 ? (item.value / donutTotal) * 100 : 0;
                    return (
                      <div key={item.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700">{item.label}</span>
                        <span className="ml-auto font-semibold text-slate-900">{ratio.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Top sản phẩm</h2>
          {topProductsQuery.isPending ? (
            <SkeletonBlock />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Sản phẩm</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Đã bán</th>
                    <th className="px-2 py-2">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(topProductsQuery.data?.items ?? []).map((item) => (
                    <tr key={String(item.variant_id ?? item.sku)} className="border-b border-slate-100">
                      <td className="px-2 py-2">{item.product_name ?? "—"}</td>
                      <td className="px-2 py-2 font-mono text-xs">{item.sku ?? "—"}</td>
                      <td className="px-2 py-2">{valueAsNumber(item.sold_quantity)}</td>
                      <td className="px-2 py-2">{formatMoney(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Cảnh báo tồn kho</h2>
          {inventoryAlertsQuery.isPending ? (
            <SkeletonBlock />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Sản phẩm</th>
                    <th className="px-2 py-2">Available</th>
                    <th className="px-2 py-2">Stock type</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryAlertsQuery.data?.items ?? []).map((item) => (
                    <tr key={String(item.variant_id ?? item.sku)} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-mono text-xs">{item.sku ?? "—"}</td>
                      <td className="px-2 py-2">{item.product_name ?? "—"}</td>
                      <td className="px-2 py-2">{valueAsNumber(item.available_quantity)}</td>
                      <td className="px-2 py-2">{item.stock_type ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Admin block</h2>
          {adminQuery.isPending ? (
            <SkeletonBlock />
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Active customers</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {valueAsNumber(adminQuery.data?.users?.active_customers)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Staff sales</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {valueAsNumber(adminQuery.data?.staff?.by_role?.sales)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Staff operations</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {valueAsNumber(adminQuery.data?.staff?.by_role?.operations)}
                </p>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
