import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { completeInbound, getInboundList } from "@/services/ops-inbound.service";

function readNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function fmtMoney(v: unknown): string {
  const n = readNum(v, Number.NaN);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function fmtDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}
function statusBadgeCls(status: string): string {
  return status === "COMPLETED"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-800";
}

export default function InboundListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [confirmInboundId, setConfirmInboundId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["ops", "inbound", "list", page, pageSize, status, type],
    queryFn: () => getInboundList({ page, pageSize, status: status || undefined, type: type || undefined }),
  });
  const completeMutation = useMutation({
    mutationFn: (inboundId: string) => completeInbound(inboundId),
    onSuccess: async (res) => {
      toast.success(typeof res.message === "string" ? res.message : "Đã hoàn tất phiếu nhập.");
      setConfirmInboundId(null);
      await queryClient.invalidateQueries({ queryKey: ["ops", "inbound"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể hoàn tất phiếu nhập.")),
  });

  const rows = useMemo(() => {
    const root = listQuery.data as Record<string, unknown> | undefined;
    const d = root?.data;
    if (Array.isArray(d)) return d as Array<Record<string, unknown>>;
    if (d && typeof d === "object" && Array.isArray((d as Record<string, unknown>).items)) {
      return (d as Record<string, unknown>).items as Array<Record<string, unknown>>;
    }
    return [] as Array<Record<string, unknown>>;
  }, [listQuery.data]);
  const pg = useMemo(() => {
    const root = listQuery.data as Record<string, unknown> | undefined;
    const p = root?.pagination as Record<string, unknown> | undefined;
    return {
      page: readNum(p?.page, page),
      totalPages: Math.max(1, readNum(p?.total_pages, 1)),
      total: readNum(p?.total, rows.length),
    };
  }, [listQuery.data, page, rows.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Inbound Allocation</h1>
        <div className="ml-auto">
          <Link to="/ops/inbound/create-from-orders">
            <Button type="button" className="bg-teal-600 hover:bg-teal-700">Tạo phiếu từ đơn nợ</Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
        <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="Type..." value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} />
        <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
        </select>
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">{pg.page} / {pg.totalPages}</div>
      </section>

      {listQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải phiếu nhập...</p>
      ) : listQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{getApiErrorMessage(listQuery.error, "Không tải được danh sách phiếu nhập.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Mã phiếu</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Tổng giá trị</th>
                <th className="px-4 py-3 text-left">Tạo bởi / lúc</th>
                <th className="px-4 py-3 text-left">Hoàn tất bởi / lúc</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const id = String(r._id ?? r.id ?? i);
                const st = String(r.status ?? "PENDING").toUpperCase();
                return (
                  <tr key={id}>
                    <td className="px-4 py-3 font-mono text-xs">{String(r.inbound_code ?? "—")}</td>
                    <td className="px-4 py-3">{String(r.type ?? "—")}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeCls(st)}`}>{st}</span></td>
                    <td className="px-4 py-3 font-semibold">{fmtMoney(r.total_value)}</td>
                    <td className="px-4 py-3">{String(r.created_by ?? "—")} · {fmtDate(r.createdAt ?? r.created_at)}</td>
                    <td className="px-4 py-3">{String(r.completed_by ?? "—")} · {fmtDate(r.completed_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link to={`/ops/inbound/${encodeURIComponent(id)}`}>
                          <Button type="button" variant="outline" className="h-8 px-3 text-xs">Xem chi tiết</Button>
                        </Link>
                        {st === "PENDING" ? (
                          <Button type="button" className="h-8 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700" disabled={completeMutation.isPending} onClick={() => setConfirmInboundId(id)}>
                            Complete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Tổng: <span className="font-semibold text-slate-900">{pg.total}</span></p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={pg.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</Button>
          <Button type="button" variant="outline" disabled={pg.page >= pg.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmInboundId)}
        title="Hoàn tất phiếu nhập?"
        description="Hành động này sẽ cộng kho và tự phân bổ đơn nợ FIFO."
        confirmLabel="Hoàn tất"
        loading={completeMutation.isPending}
        onCancel={() => setConfirmInboundId(null)}
        onConfirm={() => {
          if (!confirmInboundId) return;
          completeMutation.mutate(confirmInboundId);
        }}
      />
    </div>
  );
}
