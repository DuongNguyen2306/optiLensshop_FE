import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { normalizeRole } from "@/lib/role-routing";
import {
  approveReturn,
  fetchAdminReturns,
  receiveReturn,
  refundReturn,
  rejectReturn,
} from "@/services/returns.service";
import { useAppSelector } from "@/store/hooks";
import type { ConditionAtReceipt, ReturnRequest, ReturnStatus } from "@/types/returns";

/* ─── status helpers ─── */
type StatusMeta = { label: string; cls: string };

const STATUS_META: Record<string, StatusMeta> = {
  PENDING:    { label: "Chờ duyệt",                   cls: "bg-yellow-100 text-yellow-800" },
  APPROVED:   { label: "Đã chấp nhận trả",            cls: "bg-blue-100 text-blue-700"    },
  INSPECTING: { label: "Đã nhận & đang kiểm tra",     cls: "bg-purple-100 text-purple-700" },
  REFUNDED:   { label: "Đã hoàn tiền",                cls: "bg-emerald-100 text-emerald-700" },
  REJECTED:   { label: "Từ chối",                     cls: "bg-red-100 text-red-700"      },
  // Legacy
  RECEIVED:   { label: "Đã nhận hàng (cũ)",           cls: "bg-blue-50 text-blue-600"     },
  PROCESSING: { label: "Đang xử lý (cũ)",             cls: "bg-orange-100 text-orange-700" },
  COMPLETED:  { label: "Hoàn tất (cũ)",               cls: "bg-emerald-50 text-emerald-600" },
};

function statusMeta(status: ReturnStatus | string | undefined): StatusMeta {
  const s = String(status ?? "").toUpperCase();
  return STATUS_META[s] ?? { label: s || "—", cls: "bg-slate-100 text-slate-600" };
}

/** Các status cho phép từ chối (trước khi hoàn tiền) */
const CAN_REJECT = new Set(["PENDING", "APPROVED", "INSPECTING", "RECEIVED", "PROCESSING"]);

/* ─── helpers ─── */
function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}
function fmtMoney(n: number | undefined): string {
  if (!n || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function getOrderId(req: ReturnRequest): string {
  if (!req.order_id) return "—";
  if (typeof req.order_id === "string") return req.order_id;
  const o = req.order_id as Record<string, unknown>;
  const raw = o._id ?? o.id;
  return typeof raw === "string" ? raw : "—";
}
function getCustomerLabel(req: ReturnRequest): string {
  const uid = req.order_id && typeof req.order_id === "object"
    ? (req.order_id as Record<string, unknown>).user_id
    : null;
  if (uid && typeof uid === "object") {
    const u = uid as Record<string, unknown>;
    if (typeof u.email === "string") return u.email;
    if (typeof u.name === "string") return u.name;
  }
  return "—";
}
function getReturnId(req: ReturnRequest): string {
  return String(req._id ?? req.id ?? "");
}

const CONDITION_OPTS: { value: ConditionAtReceipt; label: string }[] = [
  { value: "NEW",     label: "Còn nguyên vẹn" },
  { value: "DAMAGED", label: "Hàng hỏng"       },
  { value: "USED",    label: "Đã qua sử dụng"  },
];

const STATUS_FILTER_OPTS = [
  { value: "",           label: "Tất cả"                   },
  { value: "PENDING",    label: "Chờ duyệt"                },
  { value: "APPROVED",   label: "Đã chấp nhận trả"         },
  { value: "INSPECTING", label: "Đã nhận & đang kiểm tra"  },
  { value: "REFUNDED",   label: "Đã hoàn tiền"             },
  { value: "REJECTED",   label: "Từ chối"                  },
];

const PAGE_SIZE = 15;

/* ─── ApproveModal (PENDING → APPROVED) ─── */
function ApproveModal({
  returnId,
  onClose,
  onSuccess,
}: { returnId: string; onClose: () => void; onSuccess: () => void }) {
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => approveReturn(returnId, { note: note.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã chấp nhận yêu cầu trả hàng.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể chấp nhận.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Chấp nhận yêu cầu trả hàng</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
          <p>Sau khi chấp nhận, khách hàng sẽ được hướng dẫn gửi hàng về kho. Trạng thái chuyển sang <strong>Đã chấp nhận trả</strong>.</p>
          <div className="space-y-1">
            <Label>Ghi chú cho khách (tùy chọn)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: Gửi hàng về địa chỉ kho ABC, ghi rõ mã đơn..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            type="button"
            className="bg-[#2bb6a3] hover:bg-teal-600"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang lưu…" : "Chấp nhận trả"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── InspectModal (APPROVED → INSPECTING) ─── */
function InspectModal({
  returnId,
  onClose,
  onSuccess,
}: { returnId: string; onClose: () => void; onSuccess: () => void }) {
  const [condition, setCondition] = useState<ConditionAtReceipt>("NEW");
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => receiveReturn(returnId, { condition_at_receipt: condition, note: note.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã nhận hàng & ghi nhận tình trạng kiểm tra.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Xác nhận nhận hàng & kiểm tra</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1">
            <Label>Tình trạng hàng nhận về <span className="text-red-500">*</span></Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ConditionAtReceipt)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-400"
            >
              {CONDITION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Ghi chú kiểm tra (tùy chọn)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Mô tả thêm về tình trạng hàng..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang lưu…" : "Xác nhận đã nhận & kiểm tra"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── RejectModal ─── */
function RejectModal({
  returnId,
  onClose,
  onSuccess,
}: { returnId: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => rejectReturn(returnId, { rejected_reason: reason.trim() }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã từ chối yêu cầu.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể từ chối.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Từ chối yêu cầu trả hàng</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-1">
          <Label>Lý do từ chối <span className="text-red-500">*</span></Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Nhập lý do từ chối..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            disabled={mutation.isPending || !reason.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang lưu…" : "Từ chối"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── RefundDialog (INSPECTING → REFUNDED, chỉ manager/admin) ─── */
function RefundDialog({
  req,
  onClose,
  onSuccess,
}: { req: ReturnRequest; onClose: () => void; onSuccess: () => void }) {
  const condition = String(req.condition_at_receipt ?? "");
  const willRestock = condition === "NEW";
  const mutation = useMutation({
    mutationFn: () => refundReturn(getReturnId(req)),
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã hoàn tiền thành công.");
      onSuccess();
      onClose();
    },
    onError: (e) => {
      const msg = getApiErrorMessage(e, "Không thể hoàn tiền.");
      const is403 = msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("permission");
      toast.error(is403 ? "Chỉ quản lý / Admin được xác nhận hoàn tiền." : msg);
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Xác nhận hoàn tiền?</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <p>
              <span className="text-slate-500">Tình trạng hàng: </span>
              <strong>{(CONDITION_OPTS.find((o) => o.value === condition)?.label ?? condition) || "—"}</strong>
            </p>
            <p className={willRestock ? "font-medium text-emerald-700" : "text-orange-700"}>
              {willRestock ? "✓ Sẽ cộng lại kho" : "✕ Không cộng lại kho (hàng hỏng / đã dùng)"}
            </p>
          </div>
          <p className="text-slate-600">Sau khi hoàn tiền, hệ thống sẽ tính và trả tiền về cho khách hàng.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang xử lý…" : "Xác nhận hoàn tiền"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── main ─── */
export default function AdminReturnsPage() {
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");
  /** operations, manager, admin có thể approve/receive/reject */
  const canProcess = role === "operations" || role === "manager" || role === "admin";
  /** Chỉ manager/admin được hoàn tiền */
  const canRefund = role === "manager" || role === "admin";

  const [statusFilter, setStatusFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [page, setPage] = useState(1);

  const [approveId, setApproveId]     = useState<string | null>(null);
  const [inspectId, setInspectId]     = useState<string | null>(null);
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [refundReq, setRefundReq]     = useState<ReturnRequest | null>(null);

  const query = useQuery({
    queryKey: ["admin", "returns", page, statusFilter, orderIdFilter],
    queryFn: () =>
      fetchAdminReturns({
        status: statusFilter || undefined,
        order_id: orderIdFilter.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const returns: ReturnRequest[] = query.data?.returns ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["admin", "returns"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý trả hàng</h1>
          <p className="mt-0.5 text-sm text-slate-500">Xử lý các yêu cầu trả hàng từ khách.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
        >
          {STATUS_FILTER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Lọc theo mã đơn..."
          value={orderIdFilter}
          onChange={(e) => { setOrderIdFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-400"
        />
        <span className="ml-auto self-center text-sm text-slate-500">Tổng: <strong>{total}</strong></span>
      </div>

      {/* Table */}
      {query.isPending ? (
        <p className="text-slate-600">Đang tải…</p>
      ) : query.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(query.error, "Không tải được danh sách.")}
        </p>
      ) : returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Không có yêu cầu nào.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã YC</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hoàn tiền</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((req) => {
                const rid = getReturnId(req);
                const st = String(req.status ?? "").toUpperCase() as ReturnStatus;
                const meta = statusMeta(st);
                const canReject = CAN_REJECT.has(st);
                return (
                  <tr key={rid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      <Link to={`/admin/returns/${rid}`} className="text-teal-700 hover:underline">
                        {rid ? `…${rid.slice(-8)}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{getCustomerLabel(req)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{getOrderId(req).slice(-8)}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(req.createdAt)}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-slate-600" title={req.return_reason}>
                      {req.return_reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p>{(st === "REFUNDED" || st === "COMPLETED") ? fmtMoney(req.refund_amount) : "—"}</p>
                        {req.restockInboundReceipt ? (
                          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Đã tạo phiếu nhập
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {/* PENDING → APPROVED: ops/manager/admin */}
                        {st === "PENDING" && canProcess ? (
                          <button
                            type="button"
                            onClick={() => setApproveId(rid)}
                            className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs text-white hover:bg-teal-700"
                          >
                            Chấp nhận trả
                          </button>
                        ) : null}

                        {/* APPROVED → INSPECTING: ops/manager/admin */}
                        {(st === "APPROVED" || st === "RECEIVED") && canProcess ? (
                          <button
                            type="button"
                            onClick={() => setInspectId(rid)}
                            className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs text-white hover:bg-purple-700"
                          >
                            Đã nhận & kiểm tra
                          </button>
                        ) : null}

                        {/* INSPECTING → REFUNDED: chỉ manager/admin */}
                        {(st === "INSPECTING" || st === "PROCESSING") && canRefund ? (
                          <button
                            type="button"
                            onClick={() => setRefundReq(req)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700"
                          >
                            Hoàn tiền
                          </button>
                        ) : null}

                        {/* Từ chối bất kỳ lúc nào trước hoàn tiền: ops/manager/admin */}
                        {canReject && canProcess ? (
                          <button
                            type="button"
                            onClick={() => setRejectId(rid)}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Từ chối
                          </button>
                        ) : null}

                        <Link
                          to={`/admin/returns/${rid}`}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Trang {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {approveId ? <ApproveModal returnId={approveId} onClose={() => setApproveId(null)} onSuccess={refetch} /> : null}
      {inspectId ? <InspectModal returnId={inspectId} onClose={() => setInspectId(null)} onSuccess={refetch} /> : null}
      {rejectId  ? <RejectModal  returnId={rejectId}  onClose={() => setRejectId(null)}  onSuccess={refetch} /> : null}
      {refundReq ? <RefundDialog req={refundReq} onClose={() => setRefundReq(null)} onSuccess={refetch} /> : null}
    </div>
  );
}
