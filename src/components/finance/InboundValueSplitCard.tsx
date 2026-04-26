import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { n, vnd } from "@/lib/finance-format";
import type { FinanceAccrual } from "@/types/finance";

const COLS = {
  pur: "hsl(221 83% 53%)",
  ret: "hsl(262 83% 58%)",
} as const;

type Props = { accrual: FinanceAccrual | undefined; className?: string };

export function InboundValueSplitCard({ accrual, className }: Props) {
  const pur = n(accrual?.purchase_inbound_value);
  const ret = n(accrual?.return_restock_inbound_value);
  const tot = pur + ret;
  if (tot <= 0 && pur === 0 && ret === 0) {
    return null;
  }
  const data = [
    { name: "Mua mới (PURCHASE/OPENING)", value: pur, fill: COLS.pur },
    { name: "Hoàn hàng nhập lại (RETURN_RESTOCK)", value: ret, fill: COLS.ret },
  ].filter((d) => d.value > 0);

  return (
    <section className={cn("space-y-2", className)}>
      <h2 className="text-base font-bold text-slate-900">Cấu thành giá trị kho tăng trong kỳ</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="white"
                strokeWidth={1}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => vnd(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col justify-center space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 last:border-0">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.fill }} aria-hidden />
                {d.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{vnd(d.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
