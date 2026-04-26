import { useMemo } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { n, vnd } from "@/lib/finance-format";

type Item = { label: string; amount: number; percent: number; key: string };

const MAX = 5;

type Props = {
  title: string;
  color: string;
  /**
   * payment: expect key `method`, `amount`, `percent` | order: `orderType`, `revenue`, `percent`
   */
  raw: Array<Record<string, unknown>>;
  valueKey: "amount" | "revenue";
  nameKey: "method" | "orderType";
  nameFormatter: (s: string) => string;
  className?: string;
};

function mergeToItems(raw: Array<Record<string, unknown>>, valueKey: "amount" | "revenue", nameKey: "method" | "orderType"): Item[] {
  const list = raw.map((x, i) => ({
    key: String(x[nameKey] ?? i),
    label: String(x[nameKey] ?? "—"),
    amount: n(x[valueKey]),
    percent: n(x.percent),
  })).filter((x) => x.amount > 0);
  list.sort((a, b) => b.amount - a.amount);
  if (list.length <= MAX) {
    return list.map((x, j) => ({ ...x, key: `${x.key}-${j}` }));
  }
  const top = list.slice(0, MAX);
  const rest = list.slice(MAX);
  const otherAmt = rest.reduce((s, x) => s + x.amount, 0);
  const otherPct = rest.reduce((s, x) => s + x.percent, 0);
  if (otherAmt > 0) {
    top.push({ key: "other", label: "Khác", amount: otherAmt, percent: otherPct });
  }
  return top;
}

export function CompositionHorizontalBars({ title, color, raw, valueKey, nameKey, nameFormatter, className }: Props) {
  const data = useMemo(
    () =>
      mergeToItems(raw, valueKey, nameKey).map((x) => ({
        ...x,
        label: nameFormatter(x.label),
        pctLabel: x.percent > 0 ? `${x.percent.toFixed(0)}%` : "",
      })),
    [raw, valueKey, nameKey, nameFormatter]
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 4, right: 32, left: 8, bottom: 4 }} barSize={20}>
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={110}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number) => [vnd(v), ""]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="amount" name="amount" fill={color} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="pctLabel" position="right" style={{ fontSize: 10, fill: "#64748b" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
