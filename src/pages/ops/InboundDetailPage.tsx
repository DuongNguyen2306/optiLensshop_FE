import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { completeInbound, getInboundDetail } from "@/services/ops-inbound.service";

function readNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function fmtMoney(v: unknown): string {
  const n = readNum(v);
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function fmtDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

export default function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [openConfirm, setOpenConfirm] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["ops", "inbound", "detail", id],
    enabled: Boolean(id),
    queryFn: () => getInboundDetail(id as string),
  });
  const completeMutation = useMutation({
    mutationFn: () => completeInbound(id as string),
    onSuccess: async (res) => {
      toast.success(typeof res.message === "string" ? res.message : "Đã hoàn tất phiếu nhập.");
      setOpenConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ["ops", "inbound"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể hoàn tất phiếu nhập.")),
  });

  const inbound = useMemo(() => {
    const root = detailQuery.data as Record<string, unknown> | undefined;
    const d = root?.data;
    return d && typeof d === "object" ? (d as Record<string, unknown>) : null;
  }, [detailQuery.data]);
  const status = String(inbound?.status ?? "").toUpperCase();
  const items = Array.isArray(inbound?.items) ? (inbound?.items as Array<Record<string, unknown>>) : [];
  const summary = inbound?.allocation_summary && typeof inbound.allocation_summary === "object"
    ? (inbound.allocation_summary as Record<string, unknown>)
    : null;
  const refs = Array.isArray(inbound?.reference_orders) ? (inbound.reference_orders as Array<unknown>) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/ops/inbound" className="text-sm font-medium text-teal-600 hover:underline">← Danh sách phiếu nhập</Link>
        <h1 className="text-2xl font-bold text-slate-900">Chi tiết phiếu nhập</h1>
        {status ? (
          <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {status}
          </span>
        ) : null}
        {status === "PENDING" ? (
          <div className="ml-auto">
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={completeMutation.isPending} onClick={() => setOpenConfirm(true)}>
              {completeMutation.isPending ? "Đang hoàn tất..." : "Hoàn tất phiếu nhập"}
            </Button>
          </div>
        ) : null}
      </div>

      {detailQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải chi tiết...</p>
      ) : detailQuery.isError || !inbound ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{getApiErrorMessage(detailQuery.error, "Không tải được chi tiết phiếu nhập.")}</p>
      ) : (
        <>
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="text-slate-500">Mã phiếu: </span><strong>{String(inbound.inbound_code ?? "—")}</strong></p>
            <p><span className="text-slate-500">Type: </span><strong>{String(inbound.type ?? "—")}</strong></p>
            <p><span className="text-slate-500">Trạng thái: </span><strong>{status || "—"}</strong></p>
            <p><span className="text-slate-500">Tạo bởi: </span><strong>{String(inbound.created_by ?? "—")}</strong></p>
            <p><span className="text-slate-500">Ngày tạo: </span><strong>{fmtDate(inbound.createdAt ?? inbound.created_at)}</strong></p>
            <p><span className="text-slate-500">Hoàn tất bởi: </span><strong>{String(inbound.completed_by ?? "—")}</strong></p>
            <p><span className="text-slate-500">Ngày hoàn tất: </span><strong>{fmtDate(inbound.completed_at)}</strong></p>
            <p><span className="text-slate-500">Tổng giá trị: </span><strong>{fmtMoney(inbound.total_value)}</strong></p>
          </section>

          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Ảnh</th>
                  <th className="px-4 py-3 text-left">Số lượng</th>
                  <th className="px-4 py-3 text-left">Giá nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const variant = item.variant && typeof item.variant === "object" ? (item.variant as Record<string, unknown>) : {};
                  const image = Array.isArray(variant.images) ? variant.images.find((x): x is string => typeof x === "string" && Boolean(x.trim())) : "";
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-3">{String(item.sku ?? variant.sku ?? "—")}</td>
                      <td className="px-4 py-3">
                        {image ? <img src={image} alt="variant" className="h-10 w-10 rounded border border-slate-200 object-cover" /> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold">{readNum(item.qty ?? item.quantity) ?? "—"}</td>
                      <td className="px-4 py-3">{fmtMoney(item.import_price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {summary ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Allocation summary</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Received</p><p className="text-xl font-bold">{readNum(summary.received_qty ?? summary.received) ?? 0}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Allocated</p><p className="text-xl font-bold">{readNum(summary.allocated_qty ?? summary.allocated) ?? 0}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Unallocated</p><p className="text-xl font-bold">{readNum(summary.unallocated_qty ?? summary.unallocated) ?? 0}</p></div>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reference orders</h2>
            {refs.length === 0 ? <p className="mt-2 text-sm text-slate-500">—</p> : (
              <div className="mt-2 flex flex-wrap gap-2">{refs.map((x, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{String(x)}</span>)}</div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={openConfirm}
        title="Hoàn tất phiếu nhập?"
        description="Hành động này sẽ cộng kho và tự phân bổ đơn nợ FIFO."
        confirmLabel="Hoàn tất"
        loading={completeMutation.isPending}
        onCancel={() => setOpenConfirm(false)}
        onConfirm={() => completeMutation.mutate()}
      />
    </div>
  );
}
