import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, Check, CheckCircle2, Circle, Clock,
  Copy, MapPin, Package, PackageX, Phone,
  RefreshCcw, RotateCcw, ShoppingBag, Truck,
} from "lucide-react";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { canCustomerCancelOrder, orderReadableStatus } from "@/lib/order-utils";
import { cancelMyOrder, confirmReceivedOrder, fetchMyOrderDetail } from "@/services/order.service";
import { createMyAddress } from "@/services/users.service";
import RequestReturnModal from "@/components/returns/RequestReturnModal";
import type { CustomerOrderListItem, OrderLineItem } from "@/types/order";

/* ─── data helpers ─── */
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
function readNum(order: CustomerOrderListItem | null, key: string): number | null {
  if (!order) return null;
  const v = (order as Record<string, unknown>)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
}
function readStr(order: CustomerOrderListItem | null, key: string): string {
  if (!order) return "";
  const v = (order as Record<string, unknown>)[key];
  return typeof v === "string" ? v.trim() : "";
}
function fmtMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
function fmtDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

/* ─── item display ─── */
function getItemName(item: OrderLineItem): string {
  const direct = [item.name, item.product_name, item.variant_name].find((v) => typeof v === "string" && (v as string).trim());
  if (direct) return String(direct);
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    const prod = v.product_id;
    if (prod && typeof prod === "object") {
      const pn = (prod as Record<string, unknown>).name;
      if (typeof pn === "string" && pn.trim()) return pn.trim();
    }
    if (typeof v.name === "string" && v.name.trim()) return v.name.trim();
    if (typeof v.sku === "string" && v.sku.trim()) return `SKU: ${v.sku.trim()}`;
  }
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    if (typeof c.name === "string" && c.name.trim()) return c.name.trim();
  }
  const t = String(item.item_type ?? "").toLowerCase();
  if (t === "lens") return "Tròng kính";
  if (t === "frame") return "Gọng kính";
  if (t === "combo") return "Combo kính";
  return "Sản phẩm";
}

function getItemImage(item: OrderLineItem): string {
  const direct = (item as Record<string, unknown>).image ?? (item as Record<string, unknown>).thumbnail;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    if (Array.isArray(v.images)) {
      const img = v.images.find((x): x is string => typeof x === "string" && Boolean(x.trim()));
      if (img) return img;
    }
    const prod = v.product_id;
    if (prod && typeof prod === "object" && Array.isArray((prod as Record<string,unknown>).images)) {
      const imgs = (prod as Record<string,unknown>).images as unknown[];
      const img = imgs.find((x): x is string => typeof x === "string" && Boolean((x as string).trim()));
      if (img) return img;
    }
  }
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    const arr = c.images ?? c.preview_image;
    if (Array.isArray(arr)) {
      const img = arr.find((x): x is string => typeof x === "string");
      if (img) return img;
    }
  }
  return "";
}

/* ─── lens params ─── */
function lensVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return v === 0 ? "0.00" : v.toFixed(2);
  if (typeof v === "string" && v.trim()) return v.trim();
  return "—";
}

function hasLensData(params: Record<string, unknown> | undefined): boolean {
  if (!params) return false;
  const keys = ["sph_right","sph_left","cyl_right","cyl_left","axis_right","axis_left","pd"];
  return keys.some((k) => {
    const v = params[k];
    return (typeof v === "number" && v !== 0) || (typeof v === "string" && v.trim() && v !== "0");
  });
}

function LensTable({ params }: { params: Record<string, unknown> | undefined }) {
  if (!params || !hasLensData(params)) {
    return (
      <p className="mt-2 text-xs italic text-slate-400">Không có thông số độ cận (Gọng không độ)</p>
    );
  }
  const rows = [
    { label: "Mắt phải", sph: lensVal(params.sph_right ?? params.right_sph), cyl: lensVal(params.cyl_right ?? params.right_cyl), ax: lensVal(params.axis_right ?? params.right_axis) },
    { label: "Mắt trái",  sph: lensVal(params.sph_left  ?? params.left_sph),  cyl: lensVal(params.cyl_left  ?? params.left_cyl),  ax: lensVal(params.axis_left  ?? params.left_axis) },
  ];
  const pd = lensVal(params.pd ?? params.pupillary_distance);
  const add = lensVal(params.add_right ?? params.add);
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[280px] rounded-lg border border-slate-100 text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Mắt</th>
            <th className="px-2 py-1.5 text-center font-medium">Cầu (SPH)</th>
            <th className="px-2 py-1.5 text-center font-medium">Trụ (CYL)</th>
            <th className="px-2 py-1.5 text-center font-medium">Trục (AX)</th>
            {add !== "—" ? <th className="px-2 py-1.5 text-center font-medium">ADD</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="px-2 py-1.5 font-medium text-slate-700">{r.label}</td>
              <td className="px-2 py-1.5 text-center font-mono">{r.sph}</td>
              <td className="px-2 py-1.5 text-center font-mono">{r.cyl}</td>
              <td className="px-2 py-1.5 text-center font-mono">{r.ax}</td>
              {add !== "—" ? <td className="px-2 py-1.5 text-center font-mono">{add}</td> : null}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-100 bg-slate-50">
          <tr>
            <td colSpan={add !== "—" ? 5 : 4} className="px-2 py-1.5">
              <span className="text-slate-500">Khoảng cách đồng tử (PD): </span>
              <span className="font-mono font-medium text-slate-700">{pd} mm</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ─── status config ─── */
function statusCfg(status: string): { label: string; bg: string; text: string; ring: string } {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; bg: string; text: string; ring: string }> = {
    pending:          { label: "Chờ xác nhận",        bg: "bg-gray-100",    text: "text-gray-700",    ring: "ring-gray-300" },
    confirmed:        { label: "Đã xác nhận",          bg: "bg-blue-100",    text: "text-blue-700",    ring: "ring-blue-300" },
    processing:       { label: "Đang xử lý",           bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-300" },
    manufacturing:    { label: "Đang gia công",         bg: "bg-purple-100",  text: "text-purple-700",  ring: "ring-purple-300" },
    received:         { label: "Hàng đã về kho",       bg: "bg-teal-100",    text: "text-teal-700",    ring: "ring-teal-300" },
    packed:           { label: "Đã đóng gói",          bg: "bg-indigo-100",  text: "text-indigo-700",  ring: "ring-indigo-300" },
    shipped:          { label: "Đang giao hàng",       bg: "bg-yellow-100",  text: "text-yellow-700",  ring: "ring-yellow-300" },
    delivered:        { label: "Đã giao",              bg: "bg-green-100",   text: "text-green-700",   ring: "ring-green-300" },
    completed:        { label: "Hoàn thành",           bg: "bg-teal-500",    text: "text-white",       ring: "ring-teal-400" },
    cancelled:        { label: "Đã hủy",               bg: "bg-red-100",     text: "text-red-700",     ring: "ring-red-300" },
    return_requested: { label: "Yêu cầu trả hàng",    bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-300" },
    returned:         { label: "Đã trả hàng",          bg: "bg-gray-100",    text: "text-gray-600",    ring: "ring-gray-300" },
    refunded:         { label: "Đã hoàn tiền",         bg: "bg-teal-100",    text: "text-teal-700",    ring: "ring-teal-300" },
  };
  return map[s] ?? { label: orderReadableStatus(status), bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" };
}

/* ─── timeline ─── */
interface TStep { label: string; date: string | null; done: boolean; active: boolean }

const PAID_PAYMENT_STATUSES = new Set(["paid", "completed", "success", "successful", "succeeded", "capture", "captured", "deposit-paid"]);

/** Ngày/giờ coi như đã thu tiền: ưu tiên paid_at, rồi bám theo trạng thái + số tiền còn lại (tránh lệch khi BE chưa ghi paid_at). */
function resolvePaidEventDate(order: CustomerOrderListItem, pay: PayInfo | null): string | null {
  if (pay?.paid_at) return pay.paid_at;
  const pSt = (pay?.status ?? "").toLowerCase();
  if (PAID_PAYMENT_STATUSES.has(pSt)) {
    const u = (order as Record<string, unknown>).updated_at;
    if (typeof u === "string" && u) return u;
    return String(order.created_at ?? "");
  }
  const rem = readNum(order, "remaining_amount");
  const dep = readNum(order, "deposit_amount");
  if (rem === 0 && dep != null && dep > 0) {
    const u = (order as Record<string, unknown>).updated_at;
    if (typeof u === "string" && u) return u;
    return String(order.created_at ?? "");
  }
  return null;
}

function buildTimeline(order: CustomerOrderListItem, pay: PayInfo | null): TStep[] {
  const statusHistory = Array.isArray((order as Record<string,unknown>).status_history)
    ? ((order as Record<string,unknown>).status_history as Array<Record<string,unknown>>)
    : [];

  function findHistoryDate(...actions: string[]): string | null {
    for (const entry of statusHistory) {
      const a = String(entry.action ?? entry.status ?? "").toLowerCase();
      if (actions.some((x) => a.includes(x))) return String(entry.at ?? entry.created_at ?? "");
    }
    return null;
  }

  const s = String(order.status ?? "").toLowerCase();
  const orderedDate = String(order.created_at ?? "");
  const paidDate = resolvePaidEventDate(order, pay) ?? findHistoryDate("deposit", "paid", "payment");
  const packedDate = findHistoryDate("packed", "fulfilled", "manufacturing");
  const deliveredDate = findHistoryDate("delivered", "completed");

  const reachedPacked = ["packed","shipped","delivered","completed","return_requested","returned","refunded"].includes(s);
  const reachedDelivered = ["delivered","completed","return_requested","returned","refunded"].includes(s);

  return [
    { label: "Ngày đặt hàng",                done: true,           active: false,      date: orderedDate },
    { label: "Đã thanh toán",               done: Boolean(paidDate),  active: !paidDate && s !== "pending", date: paidDate },
    { label: "Hoàn thành gia công",           done: reachedPacked,  active: !reachedPacked && s !== "pending" && Boolean(paidDate), date: packedDate },
    { label: "Giao hàng thành công",          done: reachedDelivered, active: s === "shipped", date: deliveredDate },
  ];
}

/* ─── pay info type ─── */
type PayInfo = { method: string; status: string; amount: number | null; paid_at: string | null; transaction_id: string | null };

/* ─── main ─── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAddressModal, setOpenAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [localShipping, setLocalShipping] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["orders", "detail", id],
    enabled: Boolean(id),
    queryFn: () => fetchMyOrderDetail(id as string),
  });

  const cancelMutation = useMutation({
    mutationFn: (oid: string) => cancelMyOrder(oid),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu hủy đơn.");
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể hủy đơn.")),
  });

  const addAddressMutation = useMutation({
    mutationFn: (address: string) => createMyAddress({ address }),
    onSuccess: () => {
      setLocalShipping(newAddress.trim());
      setOpenAddressModal(false);
      setNewAddress("");
      toast.success("Đã lưu địa chỉ nhận hàng mới.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật địa chỉ.")),
  });
  const confirmReceivedMutation = useMutation({
    mutationFn: (orderId: string) => confirmReceivedOrder(orderId),
    onSuccess: () => {
      toast.success("Đã xác nhận nhận hàng. Đơn đã hoàn tất.");
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể xác nhận đã nhận hàng.")),
  });

  const order = useMemo(() => readOrder(detailQuery.data), [detailQuery.data]);
  const oid = readId(order);
  const shortId = oid.length > 8 ? `…${oid.slice(-8)}` : oid;
  const items = readItems(order);
  const canCancel = canCustomerCancelOrder(order);
  const currentStatus = String(order?.status ?? "").toLowerCase();
  const canConfirmReceived = currentStatus === "delivered";
  const cfg = statusCfg(currentStatus);
  const isPreOrder = String(order?.order_type ?? "").toLowerCase() === "pre_order";
  const rawAddr = readStr(order, "shipping_address") || "—";
  const shippingAddr = localShipping || rawAddr;
  const missingAddr = isPreOrder && rawAddr.toLowerCase() === "khách hàng cập nhật sau";
  const shippingCarrier = readStr(order, "shipping_carrier");
  const trackingCode = readStr(order, "tracking_code");
  const cancelReason = readStr(order, "cancel_reason");
  const canRequestReturn = currentStatus === "delivered" || currentStatus === "completed";
  const isReturnRelated = ["return_requested", "returned", "refunded"].includes(currentStatus);

  const depositAmount = readNum(order, "deposit_amount");
  const remainingAmount = readNum(order, "remaining_amount");
  const finalForPay = readNum(order, "final_amount") ?? readNum(order, "total_amount");
  const paidInFull =
    (remainingAmount === 0 && (depositAmount ?? 0) > 0) ||
    (finalForPay != null &&
      depositAmount != null &&
      Math.abs(depositAmount - finalForPay) < 0.5);
  const showDepositLine = isPreOrder && !paidInFull;

  const pay = useMemo((): PayInfo | null => {
    const p = order?.payment && typeof order.payment === "object"
      ? (order.payment as Record<string, unknown>)
      : null;
    const fallbackMethod = readStr(order, "payment_method") || readStr(order, "method");
    const fallbackStatus = readStr(order, "payment_status") || readStr(order, "status_payment");
    const fallbackPaidAt = readStr(order, "paid_at");
    const fallbackTxn = readStr(order, "transaction_id");
    const fallbackAmount = readNum(order, "paid_amount");

    const method = typeof p?.method === "string" && p.method.trim() ? p.method : fallbackMethod;
    const status = typeof p?.status === "string" && p.status.trim() ? p.status : fallbackStatus;
    const paidAt = typeof p?.paid_at === "string" && p.paid_at.trim() ? p.paid_at : fallbackPaidAt;
    const transactionId = typeof p?.transaction_id === "string" && p.transaction_id.trim() ? p.transaction_id : fallbackTxn;
    const amount = typeof p?.amount === "number" ? p.amount : fallbackAmount;

    if (!method && !status && !paidAt && !transactionId && amount == null) return null;
    return {
      method: method || "—",
      status: status || "—",
      amount,
      paid_at: paidAt || null,
      transaction_id: transactionId || null,
    };
  }, [order]);

  const timeline = useMemo(() => order ? buildTimeline(order, pay) : [], [order, pay]);

  const copyId = () => {
    if (!oid) return;
    navigator.clipboard.writeText(oid).then(() => toast.success("Đã sao chép mã đơn!")).catch(() => {});
  };

  const handleReorder = () => {
    navigate("/products");
  };

  if (detailQuery.isPending) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StoreHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">Đang tải chi tiết đơn hàng…</main>
        <SiteFooter />
      </div>
    );
  }

  if (detailQuery.isError || !order) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StoreHeader />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getApiErrorMessage(detailQuery.error, "Không tải được chi tiết đơn hàng.")}
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Back + CTA ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/orders" className="flex items-center gap-1.5 text-sm font-medium text-[#2bb6a3] hover:underline">
            ← Danh sách đơn
          </Link>
          <div className="flex flex-wrap gap-2">
            {canCancel && oid ? (
              <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(oid)}>
                {cancelMutation.isPending ? "Đang hủy…" : "Hủy đơn"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="gap-1.5 text-slate-600" onClick={handleReorder}>
              <RefreshCcw className="h-3.5 w-3.5" /> Mua lại
            </Button>
            {canConfirmReceived && oid ? (
              <Button
                type="button"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                disabled={confirmReceivedMutation.isPending}
                onClick={() => confirmReceivedMutation.mutate(oid)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {confirmReceivedMutation.isPending ? "Đang xác nhận…" : "Xác nhận đã nhận hàng"}
              </Button>
            ) : null}
            {canRequestReturn && oid ? (
              <Button type="button" className="gap-1.5 bg-orange-500 hover:bg-orange-600" onClick={() => setShowReturnModal(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Yêu cầu trả hàng
              </Button>
            ) : null}
          </div>
        </div>

        {/* ── Return / status banners ── */}
        {currentStatus === "return_requested" ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <div>
              <p className="font-semibold text-orange-800">Đang xử lý yêu cầu trả hàng</p>
              <p className="mt-0.5 text-sm text-orange-700">Shop đã nhận yêu cầu và đang xử lý. Chúng tôi sẽ liên hệ sớm.</p>
            </div>
          </div>
        ) : currentStatus === "returned" ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-800">Đã trả hàng</p>
              <p className="mt-0.5 text-sm text-slate-600">Shop đã nhận lại hàng và đang tiến hành hoàn tiền.</p>
            </div>
          </div>
        ) : currentStatus === "refunded" ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <div>
              <p className="font-semibold text-teal-800">Đã hoàn tiền</p>
              <p className="mt-0.5 text-sm text-teal-700">Tiền đã hoàn về phương thức thanh toán gốc.</p>
            </div>
          </div>
        ) : null}

        {/* ── Header card ── */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {/* status bar */}
          <div className={`px-5 py-3 ${cfg.bg} flex items-center justify-between`}>
            <span className={`text-sm font-bold tracking-wide ${cfg.text}`}>{cfg.label}</span>
            {isPreOrder ? (
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                Sản phẩm đặt trước
              </span>
            ) : null}
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Mã đơn hàng</p>
                <button
                  type="button"
                  onClick={copyId}
                  title="Bấm để sao chép mã đơn"
                  className="mt-0.5 flex items-center gap-1.5 rounded-lg px-0 text-xl font-bold text-slate-900 hover:text-[#2bb6a3] transition-colors"
                >
                  #{shortId}
                  <Copy className="h-4 w-4 text-slate-400" />
                </button>
                <p className="mt-1 text-xs text-slate-400">Đặt ngày {fmtDate(order.created_at)}</p>
              </div>
              {cancelReason ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Lý do hủy: {cancelReason}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        {!isReturnRelated ? (
          <div className="mb-4 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-5 text-sm font-semibold text-slate-700 uppercase tracking-wide">Tiến trình đơn hàng</h2>
            <div className="relative flex items-start justify-between">
              {/* connecting line */}
              <div className="absolute left-0 right-0 top-3.5 mx-[calc(12.5%)] hidden h-px bg-slate-200 sm:block" />
              {timeline.map((step, idx) => {
                const prev = idx > 0 ? timeline[idx - 1] : null;
                const lineActive = prev?.done ?? false;
                return (
                  <div key={idx} className="relative z-10 flex flex-1 flex-col items-center gap-1.5 text-center">
                    {/* segment line */}
                    {idx > 0 ? (
                      <span className={`absolute right-1/2 top-3.5 hidden h-px w-full sm:block ${lineActive ? "bg-[#2bb6a3]" : "bg-slate-200"}`} />
                    ) : null}
                    {/* icon */}
                    <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      step.done
                        ? "border-[#2bb6a3] bg-[#2bb6a3]"
                        : step.active
                        ? "border-[#2bb6a3] bg-white"
                        : "border-slate-200 bg-white"
                    }`}>
                      {step.done ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : step.active ? (
                        <div className="h-2 w-2 rounded-full bg-[#2bb6a3]" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                    <p className={`text-[11px] font-semibold leading-tight ${step.done || step.active ? "text-[#2bb6a3]" : "text-slate-400"}`}>
                      {step.label}
                    </p>
                    {step.date ? (
                      <p className="text-[10px] text-slate-400 leading-tight">{fmtDate(step.date)}</p>
                    ) : (
                      <p className="text-[10px] text-slate-300 leading-tight">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── Shipping & Recipient ── */}
        <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            <Truck className="h-4 w-4 text-slate-400" /> Vận chuyển & Người nhận
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Số điện thoại</p>
                <p className="text-sm font-medium text-slate-800">{readStr(order, "phone") || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Địa chỉ giao hàng</p>
                {missingAddr ? (
                  <Button type="button" className="mt-1 h-8 bg-amber-500 text-xs text-white hover:bg-amber-600"
                    onClick={() => setOpenAddressModal(true)}>
                    Cập nhật địa chỉ ngay
                  </Button>
                ) : (
                  <p className="text-sm font-medium text-slate-800">{shippingAddr}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Đơn vị vận chuyển</p>
                <p className="text-sm font-medium text-slate-800">
                  {shippingCarrier || <span className="italic text-slate-400">Đang sắp xếp đơn vị vận chuyển</span>}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Mã vận đơn</p>
                <p className="font-mono text-sm font-medium text-slate-800">{trackingCode || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            <ShoppingBag className="h-4 w-4 text-slate-400" /> Sản phẩm đã đặt
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Không có dữ liệu sản phẩm.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const key = String(item._id ?? item.id ?? idx);
                const qty = Number(item.quantity ?? 1);
                const unitPrice = typeof item.unit_price === "number" ? item.unit_price : undefined;
                const lineTotal = typeof item.total_price === "number" ? item.total_price : unitPrice != null ? unitPrice * qty : undefined;
                const img = getItemImage(item);
                const isLens = String(item.item_type ?? "").toLowerCase() === "lens";
                const lp = item.lens_params as Record<string, unknown> | undefined;
                return (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start gap-3">
                      {/* image */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {img ? (
                          <img src={img} alt={getItemName(item)} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-300">No img</div>
                        )}
                      </div>
                      {/* info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{getItemName(item)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="text-slate-500">SL: <strong className="text-slate-700">{qty}</strong></span>
                          <span className="text-slate-500">Đơn giá: <strong className="text-slate-700">{fmtMoney(unitPrice)}</strong></span>
                          <span className="text-slate-500">Thành tiền: <strong className="text-[#2bb6a3]">{fmtMoney(lineTotal)}</strong></span>
                        </div>
                        {/* lens params */}
                        {isLens ? (
                          <LensTable params={lp} />
                        ) : lp && hasLensData(lp) ? (
                          <LensTable params={lp} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Financial Summary ── */}
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Tóm tắt thanh toán</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{fmtMoney(order.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span>{fmtMoney(order.shipping_fee)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <span>Tổng cộng</span>
              <span>{fmtMoney(order.final_amount ?? order.total_amount)}</span>
            </div>

            {/* Deposit */}
            {showDepositLine && depositAmount != null && depositAmount > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                  Đã đặt cọc {pay?.method ? `(${pay.method.toUpperCase()})` : ""}
                </span>
                <span className="font-medium text-green-600">−{fmtMoney(depositAmount)}</span>
              </div>
            ) : null}

            {/* Remaining — chỉ hiện khi đơn chưa kết thúc */}
            {remainingAmount != null && remainingAmount > 0 &&
              !["completed","delivered","cancelled","returned","refunded"].includes(currentStatus) ? (
              <div className="mt-3 rounded-xl border-2 border-orange-400 bg-orange-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  💵 Số tiền cần thanh toán khi nhận hàng
                </p>
                <p className="mt-1 text-3xl font-black text-orange-600">{fmtMoney(remainingAmount)}</p>
                <p className="mt-0.5 text-xs text-orange-500">Vui lòng chuẩn bị sẵn tiền mặt khi shipper giao hàng.</p>
              </div>
            ) : remainingAmount === 0 && depositAmount != null ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
                <p className="text-sm font-semibold text-teal-700">Đã thanh toán đầy đủ.</p>
              </div>
            ) : null}

            {/* Payment method info */}
            {pay ? (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Phương thức</span>
                  <span className="font-medium uppercase text-slate-700">{pay.method}</span>
                </div>
                {pay.paid_at ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Thanh toán lúc</span>
                    <span className="text-slate-700">{fmtDate(pay.paid_at)}</span>
                  </div>
                ) : null}
                {pay.transaction_id ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Mã GD</span>
                    <span className="font-mono text-xs text-slate-600">{pay.transaction_id}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Bottom CTAs ── */}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={handleReorder}>
            <RefreshCcw className="h-4 w-4" /> Mua lại đơn này
          </Button>
          {canConfirmReceived && oid ? (
            <Button
              type="button"
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={confirmReceivedMutation.isPending}
              onClick={() => confirmReceivedMutation.mutate(oid)}
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirmReceivedMutation.isPending ? "Đang xác nhận…" : "Xác nhận đã nhận hàng"}
            </Button>
          ) : null}
          {canRequestReturn && oid ? (
            <Button type="button" className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setShowReturnModal(true)}>
              <RotateCcw className="h-4 w-4" /> Yêu cầu trả hàng
            </Button>
          ) : null}
        </div>
      </main>

      {/* Address modal */}
      {openAddressModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Cập nhật địa chỉ nhận hàng</h3>
            <textarea
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
              className="mt-3 min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddressModal(false)}>Hủy</Button>
              <Button type="button" className="bg-amber-500 text-white hover:bg-amber-600"
                disabled={addAddressMutation.isPending}
                onClick={() => { const v = newAddress.trim(); if (!v) { toast.error("Vui lòng nhập địa chỉ."); return; } addAddressMutation.mutate(v); }}>
                {addAddressMutation.isPending ? "Đang lưu..." : "Lưu địa chỉ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Return modal */}
      {showReturnModal && oid ? (
        <RequestReturnModal
          orderId={oid}
          items={items}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["orders", "detail", id] });
            queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
          }}
        />
      ) : null}

      <SiteFooter />
    </div>
  );
}
