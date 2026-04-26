import { useQuery } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { listInventoryReceipts } from "@/services/inventory.service";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryReceipt } from "@/types/inventory";

function receiptId(r: InventoryReceipt): string {
  const id = r._id ?? r.id;
  return typeof id === "string" ? id : String(id ?? "");
}

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(d);
}

type Props = {
  enabled: boolean;
  className?: string;
};

export function RecentInboundReceiptsCard({ enabled, className }: Props) {
  const q = useQuery({
    queryKey: ["inventory", "receipts", "recent-dashboard", 1, 8],
    queryFn: () => listInventoryReceipts({ page: 1, limit: 8 }),
    enabled,
    staleTime: 60_000,
  });

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="size-5 text-teal-600" aria-hidden />
            Nhập kho gần nhất
          </CardTitle>
          <CardDescription>Phiếu nhập mới nhất trên hệ thống (theo thời gian tạo).</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {q.isPending ? (
          <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        ) : q.isError ? (
          <p className="text-sm text-slate-500">Không tải được danh sách nhập kho.</p>
        ) : !q.data?.items.length ? (
          <p className="text-sm text-slate-500">Chưa có phiếu nhập.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50/90 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5 text-right">Số lượng</th>
                  <th className="px-3 py-2.5 text-right">Đơn giá</th>
                  <th className="px-3 py-2.5">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((r, idx) => (
                  <tr key={receiptId(r) || `row-${idx}`} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatWhen(r.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                        {String(r.status ?? "—")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{Number(r.qty_in ?? 0).toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatCurrency(r.unit_cost)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-600" title={String(r.note ?? "")}>
                      {String(r.supplier_name || r.note || "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
