import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, parseMoney } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PaymentRow = { name: string; percent: number; amount: number };

const SLICE_COLORS = [
  "hsl(173 58% 38%)",
  "hsl(222 47% 32%)",
  "hsl(199 80% 48%)",
  "hsl(152 55% 42%)",
  "hsl(262 52% 48%)",
  "hsl(215 16% 55%)",
];

type Props = {
  rows: PaymentRow[];
  isPending?: boolean;
  className?: string;
};

export function PaymentMethodsPanel({ rows, isPending, className }: Props) {
  if (isPending) {
    return <div className={cn("min-h-[320px] animate-pulse rounded-xl bg-slate-100", className)} aria-busy="true" />;
  }
  if (rows.length === 0) {
    return (
      <Card className={cn("min-h-[200px] border-dashed", className)}>
        <CardHeader>
          <CardTitle>Tỷ trọng thanh toán</CardTitle>
          <CardDescription>Chưa có dữ liệu phương thức trong kỳ.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pieData = rows.map((r) => ({ name: r.name, value: Math.max(0, r.amount) }));
  const maxPct = Math.max(...rows.map((r) => r.percent), 1);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle>Tỷ trọng thanh toán</CardTitle>
        <CardDescription>Phân bổ theo giá trị giao dịch trong kỳ.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div className="mx-auto h-[160px] w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="white" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 10, fontSize: 13, border: "1px solid hsl(214 16% 90%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Phương thức thanh toán</p>
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/90 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tên</th>
                  <th className="px-3 py-2 text-right font-medium">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} aria-hidden />
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (r.percent / maxPct) * 100)}%`,
                            background: SLICE_COLORS[i % SLICE_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 tabular-nums">{formatCurrency(r.amount)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums font-semibold text-slate-900">{r.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Chuẩn hoá dữ liệu breakdown API → hàng hiển thị (không in JSON). */
export function normalizePaymentRows(raw: Array<Record<string, unknown>>, nameFormatter: (s: string) => string): PaymentRow[] {
  const list = raw
    .map((x) => ({
      name: nameFormatter(String(x.method ?? "")),
      percent: parseMoney(x.percent),
      amount: parseMoney(x.amount),
    }))
    .filter((x) => x.amount > 0);
  list.sort((a, b) => b.amount - a.amount);
  const max = 6;
  if (list.length <= max) return list;
  const top = list.slice(0, max - 1);
  const rest = list.slice(max - 1);
  const otherAmt = rest.reduce((s, x) => s + x.amount, 0);
  const otherPct = rest.reduce((s, x) => s + x.percent, 0);
  top.push({ name: "Khác", percent: otherPct, amount: otherAmt });
  return top;
}
