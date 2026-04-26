import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatCurrency";
import { vndShort } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Point = { date: string; revenue: number; cashIn: number };

type Props = {
  data: Point[];
  isPending: boolean;
  className?: string;
};

const TEAL = "hsl(173 58% 38%)";
const NAVY = "hsl(222 47% 28%)";

export function FinanceRevenueBarsCard({ data, isPending, className }: Props) {
  if (isPending) {
    return <div className={cn("h-[340px] w-full animate-pulse rounded-xl bg-slate-100", className)} aria-busy="true" />;
  }
  if (data.length === 0) {
    return (
      <Card className={cn("grid h-[340px] place-items-center border-dashed", className)}>
        <CardContent className="py-8 text-center text-sm text-slate-500">Chưa có dữ liệu doanh thu theo ngày trong kỳ.</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle>Doanh thu &amp; thực thu theo ngày</CardTitle>
        <CardDescription>Cột xanh ngọc: doanh thu thuần theo bucket. Cột navy: tiền thu từ thanh toán (nếu có).</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] w-full pb-2 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 12, bottom: 4 }} barGap={2} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 16% 88% / 0.65)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 16% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(214 16% 90%)" }} minTickGap={16} />
            <YAxis tickFormatter={(v) => vndShort(v, "K")} width={56} tick={{ fontSize: 10, fill: "hsl(215 16% 40%)" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "hsl(173 40% 96% / 0.5)" }}
              contentStyle={{
                fontSize: 13,
                borderRadius: 10,
                border: "1px solid hsl(214 16% 90%)",
                boxShadow: "0 8px 24px hsl(222 47% 11% / 0.08)",
              }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Ngày ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="revenue" name="Doanh thu thuần" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="cashIn" name="Thực thu (thanh toán)" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
