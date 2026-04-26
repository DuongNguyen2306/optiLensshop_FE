import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";
import { n } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { FinanceReconciliation } from "@/types/finance";

type Props = {
  reconciliation: FinanceReconciliation;
  className?: string;
};

const COL1 = "hsl(30 90% 48%)";
const COL2 = "hsl(220 14% 46%)";

export function ReconciliationBlock({ reconciliation, className }: Props) {
  const a = n(reconciliation.inbound_receipts_qty);
  const b = n(reconciliation.ledger_inbound_events_qty);
  const d = n(reconciliation.delta);
  const max = Math.max(a, b, 1) * 1.1;
  const inSync = Boolean(reconciliation.in_sync);

  const data = [
    { name: "Phiếu nhập", nguon: "inbound", value: a, fill: COL1 },
    { name: "Sổ cái (ledger)", nguon: "ledger", value: b, fill: COL2 },
  ];

  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-lg font-bold text-slate-900">Đối soát tồn theo kỳ</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-amber-50/40 p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Số lượng (từ phiếu nhập)</p>
          <p className="text-3xl font-black tabular-nums text-amber-950">{a.toLocaleString("vi-VN")} <span className="text-sm font-medium text-amber-800/80">cái</span></p>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/50 p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Số lượng (sổ cái kho)</p>
          <p className="text-3xl font-black tabular-nums text-slate-800">{b.toLocaleString("vi-VN")} <span className="text-sm font-medium text-slate-600">cái</span></p>
        </div>
      </div>
      <div className="h-28 sm:h-32 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-2 pr-0 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: 8, bottom: 4 }} barSize={64}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
            />
            <YAxis domain={[0, max]} allowDecimals width={32} tickFormatter={(v) => (v > 1e6 ? `${v / 1e6}M` : `${v}`)} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString("vi-VN") + " cái", "Số lượng"]}
            />
            <Bar dataKey="value" isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.nguon} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        className={cn(
          "inline-flex w-full sm:w-auto items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
          inSync
            ? "border-slate-200 bg-slate-100 text-slate-800"
            : d !== 0
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
        )}
        role="status"
        aria-live="polite"
      >
        {inSync && d === 0 ? <CheckCircle2 className="h-4 w-4 text-slate-600" aria-hidden /> : <XCircle className="h-4 w-4 text-rose-600" aria-hidden />}
        <span className="font-mono">Δ (delta) = {String(reconciliation.delta)}</span>
        <span className="font-medium">{inSync ? "Khớp" : "Cần kiểm tra"}</span>
      </div>
    </section>
  );
}
