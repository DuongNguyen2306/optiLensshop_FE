import type { LucideIcon } from "lucide-react";
import { CircleDollarSign, Landmark, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, parseMoney } from "@/lib/formatCurrency";
import { DataQualityStrip } from "./DataQualityStrip";

export type FinanceKpiVariant = "revenue" | "profit" | "cost" | "cashflow";

export type FinanceKpiItem = {
  label: string;
  value: unknown;
  variant: FinanceKpiVariant;
  /** Một dòng phụ: xu hướng hoặc ghi chú ngắn (vd. so sánh trong kỳ). */
  footer?: string;
  /** Màu footer: mặc định xanh lá nếu có dấu + */
  footerTone?: "positive" | "negative" | "neutral";
};

const variantIcon: Record<FinanceKpiVariant, LucideIcon> = {
  revenue: CircleDollarSign,
  profit: TrendingUp,
  cost: Receipt,
  cashflow: Landmark,
};

const variantShell: Record<FinanceKpiVariant, string> = {
  revenue: "bg-teal-500/12 text-teal-700 ring-1 ring-teal-600/15",
  profit: "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-600/15",
  cost: "bg-slate-500/10 text-slate-700 ring-1 ring-slate-400/20",
  cashflow: "bg-[hsl(222_47%_24%)]/10 text-[hsl(222_47%_28%)] ring-1 ring-[hsl(222_40%_34%)]/18",
};

type Props = {
  rows: [FinanceKpiItem, FinanceKpiItem, FinanceKpiItem, FinanceKpiItem];
  dataQuality: { missing: number; legacy: number };
  className?: string;
};

function footerClass(tone: FinanceKpiItem["footerTone"], text: string): string {
  if (tone === "negative") return "text-rose-600";
  if (tone === "neutral") return "text-slate-500";
  if (text.trim().startsWith("-")) return "text-rose-600";
  if (text.includes("+") || text.toLowerCase().includes("tăng")) return "text-emerald-600";
  return "text-slate-500";
}

export function FinanceKpiRow({ rows, dataQuality, className }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <DataQualityStrip missingCount={dataQuality.missing} legacyCount={dataQuality.legacy} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((k) => {
          const Icon = variantIcon[k.variant];
          const val = parseMoney(k.value);
          const show = val !== 0 || k.variant === "cashflow";
          const footer = k.footer?.trim();
          return (
            <Card
              key={k.label}
              className="relative overflow-hidden border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/60 shadow-sm"
            >
              <div className={cn("absolute right-3 top-3 rounded-xl p-2.5", variantShell[k.variant])} aria-hidden>
                <Icon className="size-5 shrink-0" strokeWidth={2} />
              </div>
              <CardContent className="pt-5 pr-14">
                <p className="text-xs font-medium tracking-wide text-slate-500">{k.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900" title={formatCurrency(k.value)}>
                  {show ? formatCurrency(k.value) : "—"}
                </p>
                {footer ? <p className={cn("mt-2 text-xs font-medium", footerClass(k.footerTone, footer))}>{footer}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
