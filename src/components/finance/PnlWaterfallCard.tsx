import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { vnd, n, vndShort } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { FinanceAccrual } from "@/types/finance";

const COL = {
  rev: "#0ea5e9",
  cogs: "#f97316",
  gp: "#22c55e",
  opex: "#a855f7",
  nop: "#0f766e",
} as const;

type Row = { step: string; v: number; key: string; color: string };

type Props = {
  accrual: FinanceAccrual | undefined;
  refunds: unknown;
  className?: string;
};

/**
 * Cột so sánh quy mô các thành phần P&L (VND) — cùng thang đo, dễ thấy “cỗ” từng mục;
 * bổ sung 1 cột tỷ lệ refund / revenue_gross nếu có từ summary (không bắn phụ).
 */
export function PnlWaterfallCard({ accrual, refunds, className }: Props) {
  const rows: Row[] = useMemo(() => {
    if (!accrual) return [];
    const a = accrual;
    const r: Row[] = [];
    if (a.revenue_gross != null && n(a.revenue_gross) > 0) {
      r.push({ step: "Doanh thu gộp", v: n(a.revenue_gross), key: "rg", color: "#06b6d4" });
    }
    r.push(
      { step: "Doanh thu thuần", v: n(a.revenue_net), key: "rn", color: COL.rev },
      { step: "COGS (giá vốn)", v: n(a.cogs), key: "c", color: COL.cogs },
      { step: "Lợi nhuận gộp", v: n(a.gross_profit), key: "gp", color: COL.gp },
      { step: "Chi phí vận hành", v: n(a.operating_expenses), key: "o", color: COL.opex },
      { step: "LN ròng vận hành", v: n(a.net_operating_profit), key: "nop", color: COL.nop }
    );
    return r;
  }, [accrual]);

  const refPct =
    n(accrual?.revenue_gross) > 0 && n(refunds) > 0 ? (n(refunds) / n(accrual?.revenue_gross)) * 100 : null;

  if (!accrual || rows.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500", className)}>
        Chưa có dữ liệu accrual P&amp;L cho kỳ này.
      </div>
    );
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">P&amp;L — cấu trúc theo kỳ (VND)</h2>
        {refPct != null && refPct > 0 ? (
          <p className="text-xs text-slate-500">
            Hoàn tiền / revenue_gross: <span className="font-semibold text-rose-700">{refPct.toFixed(1)}%</span>
            <span className="ml-1 text-slate-400">(số tuyệt đối: {vnd(refunds)})</span>
          </p>
        ) : null}
      </div>
      <div className="h-[280px] w-full min-h-[200px] rounded-2xl border border-slate-200 bg-white p-3 pr-1 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
            <XAxis
              dataKey="step"
              tick={{ fontSize: 10 }}
              angle={-25}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tickFormatter={(x) => vndShort(x, "K")}
              width={64}
            />
            <Tooltip
              formatter={(value: number) => [vnd(value), ""]}
              labelFormatter={(_, p) => {
                if (!p || !p[0]) return "";
                return String((p[0].payload as Row).step);
              }}
            />
            <Bar dataKey="v" radius={[6, 6, 0, 0]}>
              {rows.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500">
        <strong className="text-slate-700">Cách đọc:</strong> các cột cùng đơn vị (₫) — thấy nhanh quy mô; COGS + Opex là
        hạ mục chi, gross_profit &amp; net_operating là kết quả. Không thay bảng s chi tiết; refund toàn kỳ hiển thị % khi
        BE trả từ summary.
      </p>
    </section>
  );
}
