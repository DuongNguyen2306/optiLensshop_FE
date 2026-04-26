import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inboundActionMatrix, INBOUND_STATUS_LABEL, INBOUND_TYPE_LABEL } from "@/constants/inbound";
import { useInboundActions } from "@/hooks/useInboundActions";
import { useInboundDetail } from "@/hooks/useInboundDetail";
import { normalizeRole } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";
import { parseApiError } from "@/utils/parseApiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInbound } from "@/api/inboundApi";
import type { InboundPayload } from "@/types/inbound";

function fmtMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function fmtDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

function pickHistoryTimestamp(row: Record<string, unknown>): unknown {
  return row.createdAt ?? row.created_at ?? row.at ?? row.timestamp ?? row.performed_at ?? row.updatedAt ?? row.updated_at;
}

export default function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");
  const [rejectNote, setRejectNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [editMode, setEditMode] = useState(false);

  const detailQuery = useInboundDetail(id);
  const inbound = detailQuery.data;
  const inboundId = String(inbound?._id ?? inbound?.id ?? "");
  const status = String(inbound?.status ?? "").toUpperCase();
  const actions = inboundActionMatrix(status, role);
  const items = Array.isArray(inbound?.items) ? inbound.items : [];
  const historyLog = Array.isArray(inbound?.history_log) ? inbound.history_log : [];
  const allocationSummary = Array.isArray(inbound?.allocation_summary)
    ? inbound.allocation_summary
    : inbound?.allocation_summary && typeof inbound.allocation_summary === "object"
      ? [inbound.allocation_summary]
      : [];

  const [editSupplier, setEditSupplier] = useState("");
  const [editExpectedDate, setEditExpectedDate] = useState("");
  const [editNote, setEditNote] = useState("");

  const updateDraftMutation = useMutation({
    mutationFn: (payload: InboundPayload) => updateInbound(inboundId, payload),
    onSuccess: async () => {
      toast.success("Đã cập nhật DRAFT.");
      setEditMode(false);
      await queryClient.invalidateQueries({ queryKey: ["inbounds", "detail", inboundId] });
      await queryClient.invalidateQueries({ queryKey: ["inbounds", "list"] });
    },
    onError: (e) => toast.error(parseApiError(e, "Không thể cập nhật draft.")),
  });

  const { submitMutation, approveMutation, rejectMutation, cancelMutation, receiveMutation, completeMutation } = useInboundActions(inboundId);

  const totalValue = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + (Number((item as Record<string, unknown>).qty_planned ?? 0) || 0) * (Number((item as Record<string, unknown>).import_price ?? 0) || 0),
        0
      ),
    [items]
  );

  if (detailQuery.isError) {
    const anyErr = detailQuery.error as { response?: { status?: number } };
    if (anyErr?.response?.status === 404) {
      toast.error("Phiếu nhập không tồn tại");
      return <Navigate to="/admin/inventory/receipts" replace />;
    }
  }

  if (!id) {
    return <Navigate to="/admin/inventory/receipts" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/inventory/receipts" className="text-sm text-[#2bb6a3] hover:underline">
          ← Danh sách phiếu nhập
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Chi tiết phiếu nhập</h1>
      </div>

      {detailQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải chi tiết...</p>
      ) : detailQuery.isError || !inbound ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{parseApiError(detailQuery.error, "Không tải được chi tiết phiếu nhập.")}</p>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Code</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{String(inbound.inbound_code ?? inboundId)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{INBOUND_STATUS_LABEL[status] ?? status}</span>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-slate-500">Type: </span>{INBOUND_TYPE_LABEL[String(inbound.type ?? "")] ?? String(inbound.type ?? "—")}</p>
              <p><span className="text-slate-500">Supplier: </span>{String(inbound.supplier_name ?? "—")}</p>
              <p><span className="text-slate-500">Expected: </span>{fmtDate(inbound.expected_date)}</p>
              <p><span className="text-slate-500">Created at: </span>{fmtDate(inbound.createdAt ?? inbound.created_at)}</p>
            </div>
            <p className="text-sm text-slate-700"><span className="text-slate-500">Note: </span>{String(inbound.note ?? "—")}</p>
            <div className="flex flex-wrap gap-2">
              {actions.canEditDraft ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditMode(true);
                    setEditSupplier(String(inbound.supplier_name ?? ""));
                    setEditExpectedDate(String(inbound.expected_date ?? "").slice(0, 10));
                    setEditNote(String(inbound.note ?? ""));
                  }}
                >
                  Sửa Draft
                </Button>
              ) : null}
              {actions.canSubmit ? (
                <Button type="button" className="bg-[#2bb6a3]" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate(inboundId, { onSuccess: () => toast.success("Đã submit phiếu."), onError: (e) => toast.error(parseApiError(e)) })}>
                  Submit
                </Button>
              ) : null}
              {actions.canApprove ? (
                <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(inboundId, { onSuccess: () => toast.success("Đã approve."), onError: (e) => toast.error(parseApiError(e)) })}>
                  Approve
                </Button>
              ) : null}
              {actions.canReject ? (
                <div className="flex items-center gap-2">
                  <Input placeholder="Lý do reject" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                  <Button type="button" variant="outline" className="border-red-200 text-red-700" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate({ id: inboundId, note: rejectNote.trim() }, { onSuccess: () => toast.success("Đã reject."), onError: (e) => toast.error(parseApiError(e)) })}>
                    Reject
                  </Button>
                </div>
              ) : null}
              {actions.canCancel ? (
                <div className="flex items-center gap-2">
                  <Input placeholder="Lý do cancel" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  <Button type="button" variant="outline" className="border-red-200 text-red-700" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate({ id: inboundId, reason: cancelReason.trim() }, { onSuccess: () => toast.success("Đã cancel."), onError: (e) => toast.error(parseApiError(e)) })}>
                    Cancel
                  </Button>
                </div>
              ) : null}
              {actions.canReceive ? (
                <Button type="button" className="bg-indigo-600 text-white hover:bg-indigo-700" disabled={receiveMutation.isPending} onClick={() => receiveMutation.mutate(inboundId, { onSuccess: () => toast.success("Đã receive."), onError: (e) => toast.error(parseApiError(e)) })}>
                  Receive
                </Button>
              ) : null}
              {actions.canComplete ? (
                <Button type="button" className="bg-violet-600 text-white hover:bg-violet-700" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate(inboundId, { onSuccess: () => toast.success("Đã complete."), onError: (e) => toast.error(parseApiError(e)) })}>
                  Complete
                </Button>
              ) : null}
            </div>
          </section>

          {editMode ? (
            <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="font-semibold text-slate-900">Cập nhật DRAFT</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Input value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Expected date</Label>
                  <Input type="date" value={editExpectedDate} onChange={(e) => setEditExpectedDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Note</Label>
                  <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="bg-[#2bb6a3]"
                  disabled={updateDraftMutation.isPending}
                  onClick={() =>
                    updateDraftMutation.mutate({
                      type: String(inbound.type ?? "PURCHASE") as InboundPayload["type"],
                      supplier_name: editSupplier.trim() || undefined,
                      expected_date: editExpectedDate || undefined,
                      note: editNote.trim() || undefined,
                      items: items.map((item) => ({
                        variant_id: String((item as Record<string, unknown>).variant_id ?? ""),
                        qty_planned: Number((item as Record<string, unknown>).qty_planned ?? 0),
                        qty_received: Number((item as Record<string, unknown>).qty_received ?? 0),
                        import_price: Number((item as Record<string, unknown>).import_price ?? 0),
                      })),
                    })
                  }
                >
                  Lưu Draft
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                  Hủy
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Variant</th>
                    <th className="px-3 py-2 text-left">Qty planned</th>
                    <th className="px-3 py-2 text-left">Qty received</th>
                    <th className="px-3 py-2 text-left">Import price</th>
                    <th className="px-3 py-2 text-left">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const row = item as Record<string, unknown>;
                    const variant = row.variant_id;
                    const variantObj = variant && typeof variant === "object" ? (variant as Record<string, unknown>) : null;
                    const sku = String(variantObj?.sku ?? "—");
                    const name = String((variantObj?.product_id as Record<string, unknown> | undefined)?.name ?? "—");
                    const qtyPlanned = Number(row.qty_planned ?? 0);
                    const qtyReceived = Number(row.qty_received ?? 0);
                    const importPrice = Number(row.import_price ?? 0);
                    return (
                      <tr key={String(row._id ?? row.id ?? idx)}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{sku}</p>
                          <p className="text-xs text-slate-500">{name}</p>
                        </td>
                        <td className="px-3 py-2">{qtyPlanned}</td>
                        <td className="px-3 py-2">{qtyReceived}</td>
                        <td className="px-3 py-2">{fmtMoney(importPrice)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{fmtMoney(importPrice * qtyPlanned)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Tổng tạm tính FE: <strong>{fmtMoney(totalValue)}</strong> (BE là nguồn chuẩn)
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Allocation summary</h2>
            {allocationSummary.length === 0 ? (
              <p className="text-sm text-slate-500">Không có dữ liệu phân bổ.</p>
            ) : (
              <div className="space-y-2">
                {allocationSummary.map((entry, idx) => {
                  const e = entry as Record<string, unknown>;
                  const allocations = Array.isArray(e.allocations) ? (e.allocations as Array<Record<string, unknown>>) : [];
                  return (
                    <div key={idx} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm">
                        Variant: <span className="font-mono">{String(e.variant_id ?? "—")}</span> | received: {Number(e.received_qty ?? 0)} | allocated: {Number(e.allocated_qty ?? 0)} | unallocated: {Number(e.unallocated_qty ?? 0)}
                      </p>
                      {allocations.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {allocations.map((a, i) => (
                            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              {String(a.order_id ?? "—")} / {Number(a.quantity ?? 0)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">History log</h2>
            {historyLog.length === 0 ? (
              <p className="text-sm text-slate-500">Không có lịch sử.</p>
            ) : (
              <div className="space-y-2">
                {historyLog.map((h, idx) => {
                  const row = h as Record<string, unknown>;
                  return (
                    <div key={String(row._id ?? row.id ?? idx)} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-800">{String(row.action ?? "update")} • {fmtDate(pickHistoryTimestamp(row))}</p>
                      <p className="text-slate-600">
                        {String(row.from_status ?? "—")} → {String(row.to_status ?? "—")} | {String(row.note ?? "—")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <div>
        <Button type="button" variant="outline" onClick={() => navigate("/admin/inventory/receipts")}>
          Quay lại danh sách
        </Button>
      </div>
    </div>
  );
}

