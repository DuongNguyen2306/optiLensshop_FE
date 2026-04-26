import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Truck } from "lucide-react";
import { getInbounds } from "@/api/inboundApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { INBOUND_STATUS_LABEL } from "@/constants/inbound";
import { getApiErrorMessage } from "@/lib/api-error";
import { nextStatusesByOrderType, normalizeOrderStatus, orderReadableStatus } from "@/lib/order-utils";
import { normalizeRole } from "@/lib/role-routing";
import { confirmOrder, fetchMyOrderDetail, updateOrderShippingInfo, updateOrderStatus } from "@/services/order.service";
import { useAppSelector } from "@/store/hooks";
import type { CustomerOrderListItem, OrderLineItem } from "@/types/order";

const OPS_MANAGED_STATUSES = new Set([
  "processing", "manufacturing", "received", "packed",
  "shipped", "delivered",
]);
const SALES_MANAGED_STATUSES = new Set(["confirmed", "cancelled"]);

/* ─── helpers ─── */
function readOrder(data: unknown): CustomerOrderListItem | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.order && typeof o.order === "object") return o.order as CustomerOrderListItem;
  return data as CustomerOrderListItem;
}
function readId(order: CustomerOrderListItem | null): string {
  if (!order) return "";
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}
function readItems(order: CustomerOrderListItem | null): OrderLineItem[] {
  if (!order) return [];
  if (Array.isArray(order.items)) return order.items;
  const alt = (order as Record<string, unknown>).order_items;
  return Array.isArray(alt) ? (alt as OrderLineItem[]) : [];
}
function getItemName(item: OrderLineItem): string {
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    const prod = v.product_id as Record<string, unknown> | undefined;
    if (typeof prod?.name === "string") return prod.name;
    if (typeof v.name === "string") return v.name;
    if (typeof v.sku === "string") return `SKU: ${v.sku}`;
  }
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    if (typeof c.name === "string") return c.name;
  }
  if (typeof item.name === "string" && item.name) return item.name;
  const raw = String(item._id ?? item.id ?? "");
  return raw ? `Sản phẩm #${raw.slice(-6)}` : "Sản phẩm";
}
function fmtMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}
function readStr(order: CustomerOrderListItem | null, key: string): string {
  if (!order) return "";
  const v = (order as Record<string, unknown>)[key];
  return typeof v === "string" ? v.trim() : "";
}
function readNum(order: CustomerOrderListItem | null, key: string): number | null {
  if (!order) return null;
  const v = (order as Record<string, unknown>)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Cùng dữ liệu với tóm tắt khách: tổng còn lại = 0 + đã thu cọc → coi như thu đủ dù trường payment chưa sync. */
function orderAmountsSuggestSettled(o: CustomerOrderListItem | null): boolean {
  if (!o) return false;
  const rem = readNum(o, "remaining_amount");
  const dep = readNum(o, "deposit_amount");
  const fin = readNum(o, "final_amount") ?? readNum(o, "total_amount");
  if (rem === 0 && (dep != null && dep > 0)) return true;
  if (fin != null && dep != null && dep >= fin - 0.5) return true;
  return false;
}

function payStatusLabel(
  s: string,
  paidAt: string | null,
  transactionId: string | null,
  amountOk: boolean,
): string {
  if (amountOk) return "Đã thanh toán";
  if (paidAt) return "Đã thanh toán";
  if (transactionId) return "Đã thanh toán";
  const m: Record<string, string> = {
    pending: "Chưa thanh toán",
    "pending-payment": "Chưa thanh toán",
    unpaid: "Chưa thanh toán",
    "deposit-paid": "Đã cọc (một phần)",
    paid: "Đã thanh toán",
    completed: "Đã thanh toán",
    success: "Đã thanh toán",
    successful: "Đã thanh toán",
    succeeded: "Đã thanh toán",
    failed: "Thanh toán thất bại",
    refunded: "Đã hoàn tiền",
  };
  return m[s.toLowerCase()] ?? s;
}

function isPaymentDoneUI(
  status: string,
  paidAt: string | null,
  transactionId: string | null,
  amountOk: boolean,
): boolean {
  if (amountOk) return true;
  if (paidAt || transactionId) return true;
  const s = status.toLowerCase();
  if (s === "deposit-paid" && !amountOk) return false;
  return ["paid", "completed", "success", "successful", "succeeded", "deposit-paid"].includes(s);
}

function statusBadgeCls(status: string): string {
  const s = status.toLowerCase();
  if (s === "cancelled") return "bg-red-100 text-red-700";
  if (s === "delivered" || s === "completed") return "bg-green-100 text-green-700";
  if (s === "shipped") return "bg-yellow-100 text-yellow-700";
  if (s === "packed" || s === "received") return "bg-indigo-100 text-indigo-700";
  if (s === "return_requested" || s === "processing") return "bg-orange-100 text-orange-700";
  if (s === "returned") return "bg-gray-100 text-gray-600";
  if (s === "refunded") return "bg-teal-100 text-teal-700";
  if (s === "confirmed") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function inboundStatusBadgeCls(status: string): string {
  const s = status.toUpperCase();
  if (s === "DRAFT") return "bg-slate-100 text-slate-700";
  if (s === "PENDING_APPROVAL") return "bg-amber-100 text-amber-800";
  if (s === "APPROVED") return "bg-blue-100 text-blue-700";
  if (s === "RECEIVED") return "bg-indigo-100 text-indigo-700";
  if (s === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (s === "CANCELLED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function extractReferenceOrderIds(row: Record<string, unknown>): string[] {
  const direct = [row.reference_order_id, row.reference_order, row.order_id]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  const refs = row.reference_orders;
  const nested = Array.isArray(refs)
    ? refs
        .map((ref) => {
          if (typeof ref === "string") return ref.trim();
          if (ref && typeof ref === "object") {
            const o = ref as Record<string, unknown>;
            const id = o._id ?? o.id ?? o.order_id ?? o.reference_order_id;
            return typeof id === "string" ? id.trim() : "";
          }
          return "";
        })
        .filter(Boolean)
    : [];
  return Array.from(new Set([...direct, ...nested]));
}

function isConfirmedOrLater(status: string): boolean {
  const flow = [
    "pending",
    "confirmed",
    "processing",
    "manufacturing",
    "received",
    "packed",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "return_requested",
    "returned",
    "refunded",
  ];
  const idx = flow.indexOf(status.toLowerCase());
  return idx >= flow.indexOf("confirmed");
}

const SHIPPING_EDITABLE_STATUSES = new Set(["confirmed", "packed", "shipped", "completed"]);

function lensVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return "—";
}

/* ─── main ─── */
interface ConfirmState {
  mode: "sales_confirm" | "sales_reject" | "ops_update";
  title: string;
  description: string;
  nextStatus?: string;
}

const INBOUND_STEPS = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "RECEIVED", "COMPLETED"] as const;

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");

  const isSales = role === "sales";
  const isOps = role === "operations" || role === "manager" || role === "admin";
  const canUseSalesActions = role === "sales" || role === "manager" || role === "admin";

  const detailQuery = useQuery({
    queryKey: ["admin", "orders", "detail", id],
    enabled: Boolean(id),
    queryFn: () => fetchMyOrderDetail(id as string),
  });

  const order = useMemo(() => readOrder(detailQuery.data), [detailQuery.data]);
  const oid = readId(order);
  const items = readItems(order);
  const currentStatus = normalizeOrderStatus(String(order?.status ?? ""));
  const shippingEditable = SHIPPING_EDITABLE_STATUSES.has(currentStatus);

  const orderType = String((order as Record<string, unknown> | null)?.order_type ?? "stock").toLowerCase();
  const allNextStatuses = order ? nextStatusesByOrderType(orderType, currentStatus) : [];
  const nextStatuses = allNextStatuses.filter((s) => {
    if (isOps) return OPS_MANAGED_STATUSES.has(s);
    if (canUseSalesActions) return SALES_MANAGED_STATUSES.has(s);
    return false;
  });
  const nextStatusesFiltered = nextStatuses;

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [carrier, setCarrier] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const [inboundSyncRetry, setInboundSyncRetry] = useState(0);
  const canSeeInboundPanel = orderType === "pre_order" && isConfirmedOrLater(currentStatus) && Boolean(oid);

  const inboundByOrderQuery = useQuery({
    queryKey: ["inbounds", "by-order", oid, inboundSyncRetry],
    enabled: canSeeInboundPanel,
    queryFn: async () => {
      const listByRef = await getInbounds({ page: 1, pageSize: 200, reference_order_id: oid || undefined });
      let exact = listByRef.items.filter((x) => {
        const rec = x as Record<string, unknown>;
        return extractReferenceOrderIds(rec).includes(oid);
      });
      if (exact.length === 0) {
        const listFallback = await getInbounds({ page: 1, pageSize: 200 });
        exact = listFallback.items.filter((x) => {
          const rec = x as Record<string, unknown>;
          return extractReferenceOrderIds(rec).includes(oid);
        });
      }
      return exact;
    },
  });
  const relatedInbounds = useMemo(() => {
    const src = inboundByOrderQuery.data ?? [];
    const seen = new Set<string>();
    return src.filter((row, idx) => {
      const rec = row as Record<string, unknown>;
      const key = String(rec._id ?? rec.id ?? idx);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [inboundByOrderQuery.data]);
  const linkedInboundStatus = useMemo(() => {
    if (relatedInbounds.length === 0) return "";
    const rank = (s: string) => ["DRAFT", "PENDING_APPROVAL", "APPROVED", "RECEIVED", "COMPLETED", "CANCELLED"].indexOf(s);
    return [...relatedInbounds]
      .map((x) => String((x as Record<string, unknown>).status ?? "DRAFT").toUpperCase())
      .sort((a, b) => rank(b) - rank(a))[0] ?? "";
  }, [relatedInbounds]);
  const inboundReadyForReceived =
    orderType !== "pre_order" || linkedInboundStatus === "RECEIVED" || linkedInboundStatus === "COMPLETED";
  const nextStatusesVisible = nextStatusesFiltered.filter(
    (s) => !(orderType === "pre_order" && s === "received" && !inboundReadyForReceived)
  );

  useEffect(() => {
    if (!canSeeInboundPanel) return;
    if (inboundByOrderQuery.isFetching) return;
    if (relatedInbounds.length > 0) return;
    if (inboundSyncRetry >= 2) return;
    const timer = window.setTimeout(() => setInboundSyncRetry((v) => v + 1), 3000);
    return () => window.clearTimeout(timer);
  }, [canSeeInboundPanel, inboundByOrderQuery.isFetching, relatedInbounds.length, inboundSyncRetry]);

  const displayCarrier = carrier ?? readStr(order, "shipping_carrier");
  const displayTracking = tracking ?? readStr(order, "tracking_code");

  const shippingMutation = useMutation({
    mutationFn: () =>
      updateOrderShippingInfo(oid, {
        shipping_carrier: displayCarrier,
        tracking_code: displayTracking,
      }),
    onSuccess: () => {
      toast.success("Đã lưu thông tin vận chuyển.");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail", id] });
      setCarrier(null);
      setTracking(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật thông tin vận chuyển.")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ nextStatus }: { nextStatus: string }) =>
      updateOrderStatus(oid, { status: nextStatus }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái đơn.");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail", id] });
      setConfirmState(null);
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, "Không thể cập nhật trạng thái."));
      setConfirmState(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({ approve, reason }: { approve: boolean; reason?: string }) =>
      confirmOrder(oid, {
        action: approve ? "confirm" : "reject",
        reason,
      }),
    onSuccess: (_data, variables) => {
      const isPreOrderConfirm = variables.approve && orderType === "pre_order";
      toast.success(
        isPreOrderConfirm
          ? "Đơn pre-order đã xác nhận. Hệ thống đã tự tạo phiếu nhập kho chờ duyệt."
          : "Đã xử lý đơn."
      );
      if (isPreOrderConfirm) {
        setInboundSyncRetry(0);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setConfirmState(null);
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, "Không thể xử lý đơn."));
      setConfirmState(null);
    },
  });

  function handleConfirmDialog() {
    if (!confirmState) return;
    if (confirmState.mode === "ops_update" && confirmState.nextStatus) {
      statusMutation.mutate({ nextStatus: confirmState.nextStatus });
    } else if (confirmState.mode === "sales_confirm") {
      confirmMutation.mutate({ approve: true });
    } else if (confirmState.mode === "sales_reject") {
      confirmMutation.mutate({ approve: false, reason: rejectReason });
    }
  }

  const isActionPending = statusMutation.isPending || confirmMutation.isPending;

  const pay = useMemo(() => {
    if (!order?.payment || typeof order.payment !== "object") return null;
    const p = order.payment as Record<string, unknown>;
    return {
      method: typeof p.method === "string" ? p.method : "—",
      status: typeof p.status === "string" ? p.status : "—",
      amount: typeof p.amount === "number" ? p.amount : null,
      paid_at: typeof p.paid_at === "string" ? p.paid_at : null,
      transaction_id: typeof p.transaction_id === "string" ? p.transaction_id : null,
    };
  }, [order]);
  const paySettledByAmounts = useMemo(() => orderAmountsSuggestSettled(order), [order]);

  const statusHistory = useMemo(() => {
    const raw = (order as Record<string, unknown> | null)?.status_history;
    if (!Array.isArray(raw)) return [];
    return raw as Array<{ action?: string; actor?: string; at?: string }>;
  }, [order]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/orders" className="text-sm font-medium text-[#2bb6a3] hover:underline">
          ← Danh sách đơn
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Chi tiết đơn #{oid || id || "—"}</h1>
        {order?.status ? (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeCls(currentStatus)}`}>
            {orderReadableStatus(order.status)}
          </span>
        ) : null}

        {/* Action buttons */}
        {order && (
          <div className="ml-auto flex flex-wrap gap-2">
            {isSales && currentStatus === "pending" ? (
              <>
                <Button
                  type="button"
                  className="h-8 bg-[#2bb6a3] px-3 text-xs"
                  onClick={() => setConfirmState({ mode: "sales_confirm", title: "Xác nhận đơn?", description: "Sau khi xác nhận, đơn sẽ chuyển sang bước tiếp theo của vận hành." })}
                >
                  Xác nhận
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-red-200 px-3 text-xs text-red-700"
                  onClick={() => { setRejectReason(""); setConfirmState({ mode: "sales_reject", title: "Từ chối đơn?", description: "Nhập lý do từ chối." }); }}
                >
                  Từ chối
                </Button>
              </>
            ) : null}

            {(!isSales || currentStatus === "return_requested")
              ? nextStatusesVisible.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    type="button"
                    className="h-8 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                    onClick={() => setConfirmState({
                      mode: "ops_update",
                      title: `Chuyển sang "${orderReadableStatus(nextStatus)}"?`,
                      description: `Đơn sẽ chuyển từ "${orderReadableStatus(currentStatus)}" sang "${orderReadableStatus(nextStatus)}".`,
                      nextStatus,
                    })}
                  >
                    {orderReadableStatus(nextStatus)}
                  </Button>
                ))
              : null}
            {!isSales && orderType === "pre_order" && nextStatusesFiltered.includes("received") && !inboundReadyForReceived ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  title="Đơn pre-order chỉ được xác nhận 'hàng đã về' sau khi phiếu nhập đã RECEIVED/COMPLETED."
                  disabled
                >
                  Hàng đã về kho
                </Button>
                <Link to={`/admin/inventory/receipts?refOrder=${encodeURIComponent(oid)}`}>
                  <Button type="button" variant="outline" className="h-8 px-3 text-xs">
                    Đi tới phiếu nhập
                  </Button>
                </Link>
                {linkedInboundStatus === "PENDING_APPROVAL" || linkedInboundStatus === "APPROVED" ? (
                  <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-amber-700" disabled>
                    Chờ duyệt phiếu nhập
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        description={
          confirmState?.mode === "sales_reject" ? (
            <div className="space-y-2">
              <p>{confirmState.description}</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Lý do từ chối…"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400"
              />
            </div>
          ) : (
            confirmState?.description
          )
        }
        confirmLabel="Xác nhận"
        loading={isActionPending}
        onConfirm={handleConfirmDialog}
        onCancel={() => setConfirmState(null)}
      />

      {detailQuery.isPending ? (
        <p className="text-slate-600">Đang tải…</p>
      ) : detailQuery.isError || !order ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(detailQuery.error, "Không tải được chi tiết đơn.")}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Basic info */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Thông tin đơn</h2>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-slate-500">Loại đơn: </span><strong>{String(order.order_type ?? "—")}</strong></p>
                <p><span className="text-slate-500">Ngày tạo: </span><strong>{fmtDate(order.created_at)}</strong></p>
                <p><span className="text-slate-500">SĐT: </span><strong>{readStr(order, "phone") || "—"}</strong></p>
                <p><span className="text-slate-500">Địa chỉ: </span><strong>{readStr(order, "shipping_address") || "—"}</strong></p>
                {readStr(order, "cancel_reason") ? (
                  <p className="sm:col-span-2 text-red-600"><span>Lý do hủy: </span><strong>{readStr(order, "cancel_reason")}</strong></p>
                ) : null}
              </div>
            </section>

            {canSeeInboundPanel ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Phiếu nhập liên quan</h2>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/inventory/receipts?refOrder=${encodeURIComponent(oid)}`}>
                      <Button type="button" variant="outline" className="h-8 px-3 text-xs">
                        Mở danh sách phiếu nhập
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setInboundSyncRetry(0);
                        inboundByOrderQuery.refetch();
                      }}
                      disabled={inboundByOrderQuery.isFetching}
                    >
                      Làm mới
                    </Button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {INBOUND_STEPS.map((step, idx) => {
                    const reached = linkedInboundStatus
                      ? INBOUND_STEPS.indexOf(step) <= INBOUND_STEPS.indexOf(linkedInboundStatus as (typeof INBOUND_STEPS)[number])
                      : false;
                    return (
                      <div key={step} className="flex items-center gap-2 text-xs">
                        <span className={reached ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-slate-500"}>
                          {INBOUND_STATUS_LABEL[step] ?? step}
                        </span>
                        {idx < INBOUND_STEPS.length - 1 ? <span className="text-slate-300">→</span> : null}
                      </div>
                    );
                  })}
                </div>

                {inboundByOrderQuery.isError ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {getApiErrorMessage(inboundByOrderQuery.error, "Không tải được phiếu nhập liên quan đơn này.")}
                  </p>
                ) : inboundByOrderQuery.isFetching && relatedInbounds.length === 0 ? (
                  <p className="text-sm text-slate-500">Đang đồng bộ phiếu nhập...</p>
                ) : relatedInbounds.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa thấy phiếu nhập liên kết. Hệ thống có thể đang đồng bộ, bạn bấm Làm mới sau vài giây.</p>
                ) : (
                  <div className="space-y-2">
                    {relatedInbounds.map((inbound, idx) => {
                      const rec = inbound as Record<string, unknown>;
                      const inboundId = String(rec._id ?? rec.id ?? "");
                      const status = String(rec.status ?? "DRAFT").toUpperCase();
                      const createdAt = String(rec.createdAt ?? rec.created_at ?? "");
                      return (
                        <div key={inboundId || idx} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-slate-900">{String(rec.inbound_code ?? (inboundId || "—"))}</p>
                            <p className="text-xs text-slate-500">Tạo lúc: {fmtDate(createdAt)}</p>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${inboundStatusBadgeCls(status)}`}>
                              {INBOUND_STATUS_LABEL[status] ?? status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {role === "sales" ? (
                              <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled>
                                Bạn không có quyền xem phiếu nhập
                              </Button>
                            ) : (
                              <Link to={`/admin/inventory/receipts/${encodeURIComponent(inboundId)}`}>
                                <Button type="button" variant="outline" className="h-8 px-3 text-xs">
                                  Xem chi tiết phiếu
                                </Button>
                              </Link>
                            )}
                            {(role === "manager" || role === "admin") && status === "PENDING_APPROVAL" ? (
                              <Link to={`/admin/inventory/receipts/${encodeURIComponent(inboundId)}`}>
                                <Button type="button" className="h-8 px-3 text-xs">
                                  Duyệt phiếu
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="mb-2 font-semibold text-slate-800">Điều kiện chuyển bước (pre-order)</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    <li>
                      {relatedInbounds.length > 0 ? "✓" : "✕"} Có inbound liên kết đơn
                    </li>
                    <li>
                      {inboundReadyForReceived ? "✓" : "✕"} Inbound ở trạng thái RECEIVED/COMPLETED để cho phép “Hàng đã về kho”
                    </li>
                    <li>
                      {(role === "operations" || role === "manager" || role === "admin") ? "✓" : "✕"} Quyền thao tác theo vai trò
                    </li>
                  </ul>
                  {!inboundReadyForReceived ? (
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      Đơn pre-order chỉ được xác nhận “hàng đã về” sau khi phiếu nhập đã RECEIVED/COMPLETED.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Items */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sản phẩm</h2>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Sản phẩm</th>
                        <th className="px-3 py-2 text-center">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                        <th className="px-3 py-2 text-left">Lens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const key = String(item._id ?? item.id ?? idx);
                        const qty = Number(item.quantity ?? 1);
                        const unitPrice = typeof item.unit_price === "number" ? item.unit_price : undefined;
                        const lineTotal = typeof item.total_price === "number" ? item.total_price : unitPrice != null ? unitPrice * qty : undefined;
                        const lp = item.lens_params;
                        return (
                          <tr key={key} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 font-medium">{getItemName(item)}</td>
                            <td className="px-3 py-2 text-center">{qty}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{fmtMoney(lineTotal)}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {lp && typeof lp === "object" ? (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 font-mono text-[10px]">
                                  <p>R: SPH {lensVal(lp.sph_right)}, CYL {lensVal(lp.cyl_right)}, AX {lensVal(lp.axis_right)}</p>
                                  <p>L: SPH {lensVal(lp.sph_left)}, CYL {lensVal(lp.cyl_left)}, AX {lensVal(lp.axis_left)}</p>
                                  <p>PD: {lensVal(lp.pd)}</p>
                                </div>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Status history */}
            {statusHistory.length > 0 ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lịch sử trạng thái</h2>
                <ol className="space-y-2">
                  {statusHistory.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-400" />
                      <div>
                        <p className="font-medium text-slate-800">{h.action ?? "—"}</p>
                        <p className="text-xs text-slate-500">{fmtDate(h.at)} {h.actor ? `· ${h.actor}` : ""}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Payment summary */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Thanh toán</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng hàng</span>
                  <span>{fmtMoney(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phí ship</span>
                  <span>{fmtMoney(order.shipping_fee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-[#2bb6a3]">{fmtMoney(order.final_amount ?? order.total_amount)}</span>
                </div>
                {pay ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Phương thức</span>
                      <span className="uppercase">{pay.method}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Trạng thái</span>
                      <span
                        className={
                          isPaymentDoneUI(pay.status, pay.paid_at, pay.transaction_id, paySettledByAmounts)
                            ? "font-medium text-green-600"
                            : pay.status === "failed"
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {payStatusLabel(pay.status, pay.paid_at, pay.transaction_id, paySettledByAmounts)}
                      </span>
                    </div>
                    {pay.paid_at ? <div className="flex justify-between text-slate-500"><span>TT lúc</span><span>{fmtDate(pay.paid_at)}</span></div> : null}
                    {pay.transaction_id ? <div className="flex justify-between text-slate-500"><span>Mã GD</span><span className="font-mono text-xs">{pay.transaction_id}</span></div> : null}
                  </>
                ) : null}
              </div>
            </section>

            {/* Shipping info form (staff only) */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Truck className="h-4 w-4" /> Vận chuyển
              </h2>
              <p className="mb-3 text-xs text-slate-400">
                Khách xem ở trang đơn (chỉ đọc). Chỉnh được khi đơn ở trạng thái Đã xác nhận, Đang đóng gói, Đang giao hoặc Hoàn thành.
              </p>
              <fieldset disabled={!shippingEditable || shippingMutation.isPending} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Đơn vị vận chuyển</Label>
                  <Input
                    value={displayCarrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="VD: GHN, GHTK, Viettel Post"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mã vận đơn / mã giao hàng</Label>
                  <Input
                    value={displayTracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="VD: GHN123456789"
                    className="h-9 font-mono text-sm"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!shippingEditable || shippingMutation.isPending}
                  onClick={() => shippingMutation.mutate()}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {shippingMutation.isPending ? "Đang lưu…" : "Lưu vận chuyển"}
                </Button>
                {!shippingEditable ? (
                  <p className="text-center text-xs text-slate-400">
                    Trạng thái hiện tại <strong>{orderReadableStatus(order.status)}</strong> không cho phép chỉnh sửa.
                  </p>
                ) : null}
              </fieldset>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
