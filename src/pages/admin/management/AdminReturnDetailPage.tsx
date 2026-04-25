import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, PackageCheck, RotateCcw, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { normalizeRole } from "@/lib/role-routing";
import {
  approveReturn,
  fetchAdminReturnDetail,
  receiveReturn,
  refundReturn,
  rejectReturn,
} from "@/services/returns.service";
import { useAppSelector } from "@/store/hooks";
import type { ConditionAtReceipt, ReturnStatus } from "@/types/returns";

/* ─── constants ─── */
const CONDITION_LABELS: Record<string, string> = {
  NEW: "Còn nguyên vẹn",
  DAMAGED: "Hàng hỏng",
  USED: "Đã qua sử dụng",
};
const CONDITION_OPTS: { value: ConditionAtReceipt; label: string }[] = [
  { value: "NEW",     label: "Còn nguyên vẹn" },
  { value: "DAMAGED", label: "Hàng hỏng"       },
  { value: "USED",    label: "Đã qua sử dụng"  },
];
const REASON_CATEGORY_LABELS: Record<string, string> = {
  damaged_on_arrival: "Hàng hỏng khi nhận",
  wrong_item:         "Sai sản phẩm",
  changed_mind:       "Đổi ý",
  defective:          "Sản phẩm lỗi",
  other:              "Lý do khác",
};

/* ─── status helpers ─── */
type StatusMeta = { label: string; cls: string; icon: React.ReactNode };
function statusMeta(status: string): StatusMeta {
  const map: Record<string, StatusMeta> = {
    PENDING:    { label: "Chờ duyệt",                cls: "bg-yellow-100 text-yellow-800",   icon: <Clock className="h-4 w-4" /> },
    APPROVED:   { label: "Đã chấp nhận trả",         cls: "bg-blue-100 text-blue-700",       icon: <CheckCircle2 className="h-4 w-4" /> },
    INSPECTING: { label: "Đã nhận & đang kiểm tra",  cls: "bg-purple-100 text-purple-700",   icon: <PackageCheck className="h-4 w-4" /> },
    REFUNDED:   { label: "Đã hoàn tiền",             cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    REJECTED:   { label: "Từ chối",                  cls: "bg-red-100 text-red-700",         icon: <XCircle className="h-4 w-4" /> },
    RECEIVED:   { label: "Đã nhận hàng (cũ)",        cls: "bg-blue-50 text-blue-600",        icon: <PackageCheck className="h-4 w-4" /> },
    PROCESSING: { label: "Đang xử lý (cũ)",          cls: "bg-orange-100 text-orange-700",   icon: <RotateCcw className="h-4 w-4" /> },
    COMPLETED:  { label: "Hoàn tất (cũ)",            cls: "bg-emerald-50 text-emerald-600",  icon: <CheckCircle2 className="h-4 w-4" /> },
  };
  return map[status.toUpperCase()] ?? { label: status || "—", cls: "bg-slate-100 text-slate-600", icon: null };
}

/* ─── helpers ─── */
function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}
function fmtMoney(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function getOrderId(req: Record<string, unknown>): string {
  const oid = req.order_id;
  if (!oid) return "—";
  if (typeof oid === "string") return oid;
  const o = oid as Record<string, unknown>;
  return String(o._id ?? o.id ?? "—");
}
function getReturnId(req: Record<string, unknown>): string {
  return String(req._id ?? req.id ?? "");
}
function readMaybeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function readMaybeString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/* ─── Timeline ─── */
const TIMELINE_STEPS = [
  { key: "PENDING",    label: "Khách yêu cầu" },
  { key: "APPROVED",   label: "Chấp nhận"     },
  { key: "INSPECTING", label: "Kiểm tra hàng" },
  { key: "REFUNDED",   label: "Hoàn tiền"     },
];
const STATUS_TIMELINE_IDX: Record<string, number> = {
  PENDING: 0, APPROVED: 1, INSPECTING: 2,
  REFUNDED: 3, COMPLETED: 3,
  // legacy
  RECEIVED: 2, PROCESSING: 2,
};

/* ─── Modals ─── */
function ApproveModal({ rid, onClose, onSuccess }: { rid: string; onClose: () => void; onSuccess: () => void }) {
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: () => approveReturn(rid, { note: note.trim() || undefined }),
    onSuccess: (r) => { toast.success(r.message ?? "Đã chấp nhận yêu cầu."); onSuccess(); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể chấp nhận.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-slate-900">Chấp nhận yêu cầu trả hàng</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <p className="text-slate-600">
            Sau khi chấp nhận, trạng thái chuyển sang <strong>Đã chấp nhận trả</strong>. Khách sẽ được yêu cầu gửi hàng về kho.
          </p>
          <div className="space-y-1">
            <Label>Ghi chú cho khách (tùy chọn)</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="VD: Gửi về địa chỉ kho ABC, ghi rõ mã đơn..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" className="bg-[#2bb6a3] hover:bg-teal-600" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Đang lưu…" : "Chấp nhận trả"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InspectModal({ rid, onClose, onSuccess }: { rid: string; onClose: () => void; onSuccess: () => void }) {
  const [condition, setCondition] = useState<ConditionAtReceipt>("NEW");
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: () => receiveReturn(rid, { condition_at_receipt: condition, note: note.trim() || undefined }),
    onSuccess: (r) => { toast.success(r.message ?? "Đã ghi nhận nhận hàng & kiểm tra."); onSuccess(); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-slate-900">Xác nhận nhận hàng & kiểm tra</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1">
            <Label>Tình trạng hàng nhận về <span className="text-red-500">*</span></Label>
            <select value={condition} onChange={(e) => setCondition(e.target.value as ConditionAtReceipt)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-400">
              {CONDITION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Ghi chú kiểm tra (tùy chọn)</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Mô tả thêm về tình trạng hàng..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" className="bg-purple-600 hover:bg-purple-700" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Đang lưu…" : "Xác nhận đã nhận & kiểm tra"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ rid, onClose, onSuccess }: { rid: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () => rejectReturn(rid, { rejected_reason: reason.trim() }),
    onSuccess: (r) => { toast.success(r.message ?? "Đã từ chối yêu cầu."); onSuccess(); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể từ chối.")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-slate-900">Từ chối yêu cầu trả hàng</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-1">
          <Label>Lý do từ chối <span className="text-red-500">*</span></Label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
            placeholder="Nhập lý do từ chối..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400" />
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" className="bg-red-600 hover:bg-red-700"
            disabled={mut.isPending || !reason.trim()} onClick={() => mut.mutate()}>
            {mut.isPending ? "Đang lưu…" : "Từ chối"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RefundConfirm({ rid, condition, onClose, onSuccess }: {
  rid: string; condition: string; onClose: () => void; onSuccess: () => void;
}) {
  const willRestock = condition === "NEW";
  const mut = useMutation({
    mutationFn: () => refundReturn(rid),
    onSuccess: (r) => { toast.success(r.message ?? "Đã hoàn tiền thành công."); onSuccess(); onClose(); },
    onError: (e) => {
      const raw = getApiErrorMessage(e, "");
      const is403 = raw.includes("403") || raw.toLowerCase().includes("forbidden") || raw.toLowerCase().includes("permission");
      toast.error(is403 ? "Chỉ quản lý / Admin được xác nhận hoàn tiền." : (raw || "Không thể hoàn tiền."));
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-slate-900">Xác nhận hoàn tiền?</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
            <p>
              <span className="text-slate-500">Tình trạng hàng: </span>
              <strong>{(CONDITION_LABELS[condition] ?? condition) || "—"}</strong>
            </p>
            <p className={willRestock ? "font-medium text-emerald-700" : "text-orange-700"}>
              {willRestock ? "✓ Sẽ cộng lại kho" : "✕ Không cộng lại kho (hàng hỏng / đã dùng)"}
            </p>
          </div>
          <p className="text-slate-600">Hệ thống sẽ tính và hoàn tiền về tài khoản khách hàng. Đơn hàng gốc chuyển sang trạng thái hoàn trả.</p>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Đang xử lý…" : "Xác nhận hoàn tiền"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── main ─── */
const CAN_REJECT_STATUSES = new Set(["PENDING", "APPROVED", "INSPECTING", "RECEIVED", "PROCESSING"]);

export default function AdminReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");

  /** operations, manager, admin: approve / receive / reject */
  const canProcess = role === "operations" || role === "manager" || role === "admin";
  /** Chỉ manager / admin: hoàn tiền */
  const canRefund  = role === "manager"    || role === "admin";

  const [showApprove, setShowApprove] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [showRefund,  setShowRefund]  = useState(false);

  const query = useQuery({
    queryKey: ["admin", "returns", "detail", id],
    enabled: Boolean(id),
    queryFn: () => fetchAdminReturnDetail(id as string),
  });

  const req = query.data as Record<string, unknown> | undefined;
  const status = String(req?.status ?? "").toUpperCase() as ReturnStatus;
  const meta = statusMeta(status);
  const condition = String(req?.condition_at_receipt ?? "") as ConditionAtReceipt;
  const historyLog = Array.isArray(req?.history_log)
    ? (req.history_log as Array<Record<string, unknown>>) : [];
  const restockLog = Array.isArray(req?.restockLog) ? req.restockLog : [];
  const items = Array.isArray(req?.items) ? (req.items as Array<Record<string, unknown>>) : [];
  const rid = req ? getReturnId(req) : "";
  const tlIdx = STATUS_TIMELINE_IDX[status] ?? 0;

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["admin", "returns", "detail", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "returns"] });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/returns" className="text-sm font-medium text-[#2bb6a3] hover:underline">← Danh sách</Link>
        <h1 className="text-xl font-bold text-slate-900">Chi tiết yêu cầu trả hàng</h1>
        {req ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.cls}`}>
            {meta.icon}{meta.label}
          </span>
        ) : null}

        {/* Action buttons (ops+) */}
        {req && canProcess ? (
          <div className="ml-auto flex flex-wrap gap-2">
            {/* PENDING → APPROVED */}
            {status === "PENDING" ? (
              <Button type="button" className="h-8 bg-[#2bb6a3] px-3 text-xs hover:bg-teal-600" onClick={() => setShowApprove(true)}>
                Chấp nhận trả
              </Button>
            ) : null}

            {/* APPROVED → INSPECTING */}
            {(status === "APPROVED" || status === "RECEIVED") ? (
              <Button type="button" className="h-8 bg-purple-600 px-3 text-xs text-white hover:bg-purple-700" onClick={() => setShowInspect(true)}>
                Đã nhận & kiểm tra
              </Button>
            ) : null}

            {/* INSPECTING → REFUNDED: chỉ manager/admin */}
            {(status === "INSPECTING" || status === "PROCESSING") ? (
              canRefund ? (
                <Button type="button" className="h-8 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700" onClick={() => setShowRefund(true)}>
                  Hoàn tiền
                </Button>
              ) : (
                <span className="self-center text-xs italic text-slate-400">Chỉ quản lý / Admin được hoàn tiền</span>
              )
            ) : null}

            {/* Từ chối: bất kỳ lúc nào trước hoàn tiền */}
            {CAN_REJECT_STATUSES.has(status) ? (
              <Button type="button" variant="outline" className="h-8 border-red-200 px-3 text-xs text-red-700" onClick={() => setShowReject(true)}>
                Từ chối
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Loading / Error ── */}
      {query.isPending ? (
        <p className="text-slate-600">Đang tải…</p>
      ) : query.isError || !req ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(query.error, "Không tải được chi tiết.")}
        </p>
      ) : (
        <>
          {/* ── Timeline ── */}
          {status !== "REJECTED" ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="relative flex items-start justify-between">
                {/* connecting line */}
                <div className="absolute left-0 right-0 top-4 mx-[16px] h-0.5 bg-slate-200" />
                <div
                  className="absolute left-0 top-4 h-0.5 bg-teal-500 transition-all duration-500"
                  style={{ width: `${(tlIdx / (TIMELINE_STEPS.length - 1)) * 100}%`, right: "auto", marginLeft: "16px" }}
                />
                {TIMELINE_STEPS.map((step, i) => {
                  const done   = i < tlIdx;
                  const active = i === tlIdx;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition
                        ${done   ? "border-teal-500 bg-teal-500 text-white"
                        : active ? "border-teal-500 bg-white text-teal-600"
                                 : "border-slate-200 bg-white text-slate-400"}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <p className={`mt-2 text-center text-[11px] font-medium leading-tight
                        ${active ? "text-teal-700" : done ? "text-slate-600" : "text-slate-400"}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── REJECTED banner ── */}
          {status === "REJECTED" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 font-semibold text-red-800"><XCircle className="h-4 w-4" /> Yêu cầu đã bị từ chối</p>
              {req.rejected_reason ? (
                <p className="mt-1 text-sm text-red-700">Lý do: {String(req.rejected_reason)}</p>
              ) : null}
              <p className="mt-1 text-xs text-red-500">Đơn hàng gốc đã được trả về trạng thái "Đã giao".</p>
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">

              {/* ── PENDING: nổi bật lý do khách ── */}
              {status === "PENDING" ? (
                <section className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-5">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-800">
                    <Clock className="h-4 w-4" /> Lý do yêu cầu trả hàng của khách
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                    {REASON_CATEGORY_LABELS[String(req.reason_category ?? "")] ?? String(req.reason_category ?? "—")}
                  </p>
                  <p className="mt-1 text-sm text-yellow-900">{String(req.return_reason ?? "—")}</p>
                </section>
              ) : null}

              {/* ── APPROVED: banner chờ khách gửi hàng ── */}
              {status === "APPROVED" ? (
                <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="flex items-center gap-2 font-semibold text-blue-800">
                    <PackageCheck className="h-4 w-4" /> Đã chấp nhận — đang chờ khách gửi hàng về
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Khi nhận được kiện hàng, nhấn <strong>Đã nhận & kiểm tra</strong> và chọn tình trạng hàng.
                  </p>
                </section>
              ) : null}

              {/* ── INSPECTING: kết quả kiểm tra ── */}
              {(status === "INSPECTING" || status === "PROCESSING") ? (
                <section className={`rounded-xl border-2 p-5 ${condition === "NEW" ? "border-emerald-300 bg-emerald-50" : "border-orange-300 bg-orange-50"}`}>
                  <h2 className={`mb-2 flex items-center gap-2 text-sm font-bold ${condition === "NEW" ? "text-emerald-800" : "text-orange-800"}`}>
                    <PackageCheck className="h-4 w-4" /> Kết quả kiểm tra hàng nhận về
                  </h2>
                  <p className={`text-base font-bold ${condition === "NEW" ? "text-emerald-700" : "text-orange-700"}`}>
                    {(CONDITION_LABELS[condition] ?? condition) || "—"}
                  </p>
                  <p className={`mt-1 text-sm ${condition === "NEW" ? "text-emerald-600" : "text-orange-600"}`}>
                    {condition === "NEW"
                      ? "Hàng còn nguyên vẹn → sẽ được cộng lại vào kho sau khi hoàn tiền."
                      : "Hàng bị hỏng / đã dùng → không cộng lại kho."}
                  </p>
                  {canRefund ? (
                    <p className="mt-2 text-xs text-slate-500">Xem xét và nhấn <strong>Hoàn tiền</strong> để hoàn tất.</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 italic">Đang chờ quản lý / Admin xác nhận hoàn tiền.</p>
                  )}
                </section>
              ) : null}

              {/* ── REFUNDED: kết quả ── */}
              {status === "REFUNDED" || status === "COMPLETED" ? (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Đã hoàn tiền thành công
                  </p>
                  {req.refund_amount != null ? (
                    <p className="mt-1 text-2xl font-black text-emerald-700">{fmtMoney(req.refund_amount as number)}</p>
                  ) : null}
                  {req.is_restocked != null ? (
                    <p className={`mt-1 text-xs ${req.is_restocked ? "text-emerald-600" : "text-orange-600"}`}>
                      {req.is_restocked ? "✓ Đã cộng lại kho" : "✕ Không cộng lại kho"}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {/* ── Thông tin yêu cầu ── */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Thông tin yêu cầu</h2>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-slate-500">Mã đơn gốc: </span><strong className="font-mono text-xs">{getOrderId(req)}</strong></p>
                  <p><span className="text-slate-500">Ngày tạo: </span><strong>{fmtDate(req.createdAt as string)}</strong></p>
                  <p><span className="text-slate-500">Loại lý do: </span>
                    <strong>{REASON_CATEGORY_LABELS[String(req.reason_category ?? "")] ?? String(req.reason_category ?? "—")}</strong>
                  </p>
                  <p className="sm:col-span-2">
                    <span className="text-slate-500">Lý do chi tiết: </span>
                    <strong>{String(req.return_reason ?? "—")}</strong>
                  </p>
                  {condition ? (
                    <p><span className="text-slate-500">Tình trạng hàng: </span>
                      <strong className={condition === "NEW" ? "text-emerald-700" : "text-orange-700"}>
                        {CONDITION_LABELS[condition] ?? condition}
                      </strong>
                    </p>
                  ) : null}
                  {req.rejected_reason ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 sm:col-span-2">
                      <span>Lý do từ chối: </span><strong>{String(req.rejected_reason)}</strong>
                    </p>
                  ) : null}
                </div>
              </section>

              {/* ── Sản phẩm trả ── */}
              {items.length > 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sản phẩm trả</h2>
                  <div className="space-y-2">
                    {items.map((item, i) => {
                      const orderItem = item.order_item_id && typeof item.order_item_id === "object"
                        ? (item.order_item_id as Record<string, unknown>)
                        : null;
                      const variantObj = item.variant_id && typeof item.variant_id === "object"
                        ? (item.variant_id as Record<string, unknown>)
                        : null;
                      const productObj = variantObj?.product_id && typeof variantObj.product_id === "object"
                        ? (variantObj.product_id as Record<string, unknown>)
                        : null;

                      const imageFromArray =
                        Array.isArray(item.images)
                          ? item.images.find((x): x is string => typeof x === "string" && Boolean(x.trim()))
                          : null;
                      const variantImage =
                        Array.isArray(variantObj?.images)
                          ? variantObj?.images.find((x): x is string => typeof x === "string" && Boolean(x.trim()))
                          : null;
                      const productImage =
                        Array.isArray(productObj?.images)
                          ? productObj?.images.find((x): x is string => typeof x === "string" && Boolean(x.trim()))
                          : null;
                      const imageSrc =
                        readMaybeString(item.image) ??
                        imageFromArray ??
                        readMaybeString(orderItem?.image) ??
                        variantImage ??
                        productImage ??
                        null;

                      const name =
                        readMaybeString(item.product_name) ??
                        readMaybeString(orderItem?.product_name) ??
                        readMaybeString(orderItem?.name) ??
                        readMaybeString(variantObj?.name) ??
                        readMaybeString(productObj?.name) ??
                        "—";
                      const sku =
                        readMaybeString(item.sku) ??
                        readMaybeString(orderItem?.sku) ??
                        readMaybeString(variantObj?.sku) ??
                        "—";
                      const productType =
                        readMaybeString(item.product_type) ??
                        readMaybeString(productObj?.type) ??
                        readMaybeString(orderItem?.item_type) ??
                        "—";
                      const orderedQty =
                        readMaybeNumber(item.ordered_quantity) ??
                        readMaybeNumber(orderItem?.quantity);
                      const returnQty =
                        readMaybeNumber(item.return_quantity) ??
                        readMaybeNumber(item.quantity) ??
                        readMaybeNumber(orderItem?.return_quantity);
                      const unitPrice =
                        readMaybeNumber(item.unit_price) ??
                        readMaybeNumber(orderItem?.unit_price) ??
                        readMaybeNumber(variantObj?.price);
                      const lineTotal =
                        readMaybeNumber(item.line_total) ??
                        (unitPrice != null && returnQty != null ? unitPrice * returnQty : null);

                      return (
                        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                              {imageSrc ? (
                                <img src={imageSrc} alt={name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-300">—</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">{name}</p>
                              <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                                <p>SKU: <span className="font-medium text-slate-800">{sku}</span></p>
                                <p>Loại: <span className="font-medium text-slate-800">{productType}</span></p>
                                <p>SL mua: <span className="font-medium text-slate-800">{orderedQty ?? "—"}</span></p>
                                <p>SL trả: <span className="font-medium text-slate-800">{returnQty ?? "—"}</span></p>
                                <p>Đơn giá: <span className="font-medium text-slate-800">{fmtMoney(unitPrice)}</span></p>
                                <p>Thành tiền trả: <span className="font-semibold text-slate-900">{fmtMoney(lineTotal)}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {/* ── Kết quả nhập kho ── */}
              {restockLog.length > 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Kết quả nhập kho</h2>
                  <div className="space-y-2 text-sm">
                    {restockLog.map((entry, i) => {
                      const e = entry as Record<string, unknown>;
                      return (
                        <div key={i} className={`rounded-lg px-3 py-2 ${e.restocked ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>
                          <span>{String(e.variant_id ?? e.item ?? "Item")}: </span>
                          <strong>{e.restocked ? `+${String(e.quantity ?? 1)} cộng kho` : "Không cộng kho"}</strong>
                          {e.note ? <span className="ml-2 text-xs opacity-70">{String(e.note)}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            {/* ── Right: lịch sử xử lý ── */}
            <div>
              <section className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lịch sử xử lý</h2>
                {historyLog.length === 0 ? (
                  <p className="text-sm text-slate-400">Chưa có lịch sử.</p>
                ) : (
                  <ol className="space-y-4">
                    {historyLog.map((h, i) => {
                      const action = String(h.action ?? "").toUpperCase();
                      const ACTION_LABELS: Record<string, string> = {
                        RETURN_REQUESTED: "Khách yêu cầu trả",
                        APPROVED:         "Đã chấp nhận",
                        INSPECTING:       "Đã nhận hàng & kiểm tra",
                        REFUNDED:         "Đã hoàn tiền",
                        REJECTED:         "Đã từ chối",
                        RECEIVED:         "Đã nhận hàng",    // legacy
                        PROCESSING:       "Đang xử lý",      // legacy
                        COMPLETED:        "Hoàn tất",        // legacy
                      };
                      const isLast = i === historyLog.length - 1;
                      return (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${isLast ? "bg-teal-500" : "bg-slate-300"}`} />
                            {!isLast ? <div className="mt-1 w-0.5 flex-1 bg-slate-100" style={{ minHeight: 24 }} /> : null}
                          </div>
                          <div className="pb-1">
                            <p className="font-semibold text-slate-800">{ACTION_LABELS[action] ?? String(h.action ?? "—")}</p>
                            {h.actor ? <p className="text-xs text-slate-500">Bởi: {String(h.actor)}</p> : null}
                            <p className="text-xs text-slate-400">{fmtDate(h.at as string)}</p>
                            {h.note ? <p className="mt-0.5 text-xs italic text-slate-600">{String(h.note)}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {showApprove ? <ApproveModal rid={rid} onClose={() => setShowApprove(false)} onSuccess={refetch} /> : null}
      {showInspect ? <InspectModal rid={rid} onClose={() => setShowInspect(false)} onSuccess={refetch} /> : null}
      {showReject  ? <RejectModal  rid={rid} onClose={() => setShowReject(false)}  onSuccess={refetch} /> : null}
      {showRefund  ? <RefundConfirm rid={rid} condition={condition} onClose={() => setShowRefund(false)} onSuccess={refetch} /> : null}
    </div>
  );
}
