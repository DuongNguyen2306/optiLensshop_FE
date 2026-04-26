import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import { n } from "@/lib/finance-format";

type Row = {
  name: string;
  revenue: number;
  sold: number;
};

type Props = {
  items: Array<{
    name?: string;
    sku?: string | null;
    revenue?: number;
    sold?: number;
    variant_id?: string;
  }>;
  className?: string;
};

function shortName(name: string, sku: string | undefined) {
  const t = (name && name.trim() ? name : sku || "—") as string;
  return t.length > 32 ? t.slice(0, 30) + "…" : t;
}

export function TopProductsBar({ items, className }: Props) {
  const data = useMemo((): (Row & { y: string })[] => {
    return [...items]
      .map((x, i) => ({
        name: String(x.name ?? "—"),
        y: shortName(String(x.name ?? "—"), x.sku ?? undefined),
        revenue: n(x.revenue),
        sold: n(x.sold),
        key: String(x.variant_id ?? i),
      }))
      .filter((r) => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [items]);

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Không có dữ liệu top sản phẩm.</p>;
  }

  return (
    <div className={cn("h-[min(400px,70vh)] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 28, left: 4, bottom: 4 }} barSize={18}>
          <XAxis type="number" tickFormatter={(v) => `${Math.round((v as number) / 1_000_000)}M`} fontSize={10} />
          <YAxis dataKey="y" type="category" width={100} tick={{ fontSize: 9 }} />
          <Tooltip
            cursor={{ fill: "hsl(210 40% 98% / 0.4)" }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const p = payload[0].payload as Row;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-slate-600">Doanh thu: {formatCurrency(p.revenue)}</p>
                  {p.sold > 0 ? <p className="text-slate-500">Bán: {p.sold}</p> : null}
                </div>
              );
            }}
          />
            <Bar dataKey="revenue" name="revenue" fill="hsl(160 50% 38%)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
