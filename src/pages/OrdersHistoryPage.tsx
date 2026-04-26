import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { cancelMyOrder, fetchMyOrders } from "@/services/order.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { canCustomerCancelOrder, orderMatchesKindFilter, orderTypeForListApi } from "@/lib/order-utils";
import type { OrderKindFilter } from "@/lib/order-utils";
import type { CustomerOrderListItem } from "@/types/order";
import { ORDER_STATUS_FILTER_VALUES } from "@/types/order";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

/* ─── constants ─── */
const LIMIT_OPTIONS = [10, 20, 50] as const;

const STATUS_LABELS: Record<string, string> = {
  "": "Tất cả",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  fulfilled: "Hoàn tất gia công",
  manufacturing: "Đang gia công tròng",
  received: "Hàng đã về kho",
  packed: "Đã đóng gói",
  shipping: "Đang giao",
  shipped: "Đang giao hàng",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  return_requested: "Yêu cầu trả hàng",
  returned: "Đã trả hàng",
  refunded: "Đã hoàn tiền",
};

const PAYMENT_LABELS: Record<string, string> = {
  momo: "MoMo",
  vnpay: "VNPay",
  cod: "Khi nhận hàng",
};

/* ─── status badge styles ─── */
function statusBadgeCls(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  if (s === "refunded" || s === "returned") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "return_requested") return "bg-orange-50 text-orange-700 border-orange-200";
  if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "shipped" || s === "shipping") return "bg-sky-50 text-sky-700 border-sky-200";
  if (s === "packed" || s === "received") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (s === "pending") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "confirmed" || s === "processing" || s === "manufacturing" || s === "fulfilled")
    return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/* ─── helpers ─── */
function fmtMoney(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function shortId(id: string | undefined): string {
  if (!id) return "—";
  return id.length <= 12 ? id : `…${id.slice(-10)}`;
}

function payMethod(order: CustomerOrderListItem): string {
  const m = (order.payment as Record<string, unknown> | undefined)?.method;
  if (typeof m === "string") return PAYMENT_LABELS[m.toLowerCase()] ?? m;
  return "—";
}

/* ─── skeleton ─── */
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Mobile compact card ─── */
function MobileCard({
  order,
  onCancel,
  cancelling,
}: {
  order: CustomerOrderListItem;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const oid = order._id ?? order.id ?? "";
  const canCancel = canCustomerCancelOrder(order);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] text-slate-400">#{shortId(oid)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{fmtDate(order.created_at)}</p>
        </div>
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeCls(order.status))}>
          {STATUS_LABELS[(order.status ?? "").toLowerCase()] ?? order.status}
        </span>
      </div>
      {String(order.order_type ?? "").toLowerCase() === "pre_order" ? (
        <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          Pre-order: đang chờ shop xác nhận/gia công
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{payMethod(order)}</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{fmtMoney(order.final_amount ?? order.total_amount)}</p>
        </div>
        <div className="flex gap-2">
          {oid && (
            <Link
              to={`/orders/${encodeURIComponent(oid)}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" />
              Chi tiết
            </Link>
          )}
          {canCancel && oid && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => onCancel(oid)}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Hủy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function OrdersHistoryPage() {
  const { user } = useAppSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [orderKind, setOrderKind] = useState<OrderKindFilter>("");
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const isCustomer = (user?.role ?? "").toLowerCase() === "customer";

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => cancelMyOrder(orderId, reason),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu hủy đơn.");
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể hủy đơn hàng.")),
  });
  const askCancelOrder = (orderId: string) => {
    setPendingCancelOrderId(orderId);
    setCancelReason("");
  };
  const confirmCancelOrder = () => {
    if (!pendingCancelOrderId) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Vui lòng nhập lý do hủy đơn.");
      return;
    }
    cancelMutation.mutate({ orderId: pendingCancelOrderId, reason });
    setPendingCancelOrderId(null);
    setCancelReason("");
  };
  const closeCancelDialog = () => {
    if (cancelMutation.isPending) return;
    setPendingCancelOrderId(null);
    setCancelReason("");
  };

  const lastErrorRef = useRef<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["orders", "my", page, limit, statusFilter, orderKind],
    queryFn: () =>
      fetchMyOrders({
        page,
        limit,
        status: statusFilter || undefined,
        order_type: orderTypeForListApi(orderKind),
      }),
    enabled: isCustomer,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!ordersQuery.isError || !ordersQuery.error) return;
    const msg = getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn hàng.");
    if (lastErrorRef.current !== msg) {
      lastErrorRef.current = msg;
      toast.error(msg);
    }
  }, [ordersQuery.isError, ordersQuery.error]);

  useEffect(() => {
    if (!ordersQuery.isError) lastErrorRef.current = null;
  }, [ordersQuery.isError]);

  const allItems = ordersQuery.data?.items ?? [];
  const pg = ordersQuery.data?.pagination;

  // Client-side filter bằng search (theo mã đơn)
  const items = useMemo(() => {
    let list = allItems.filter((o) => orderMatchesKindFilter(o, orderKind));
    if (!search.trim()) {
      return list;
    }
    const q = search.trim().toLowerCase();
    list = list.filter((o) => {
      const id = String(o._id ?? o.id ?? "").toLowerCase();
      return id.includes(q);
    });
    return list;
  }, [allItems, search, orderKind]);

  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-sm text-slate-600">Trang này chỉ dành cho tài khoản khách hàng.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-teal-600 hover:underline">
            ← Về trang chủ
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đơn hàng của tôi</h1>
            <p className="mt-0.5 text-sm text-slate-500">Theo dõi trạng thái và lịch sử giao hàng.</p>
          </div>
          <Link to="/" className="text-sm font-medium text-teal-600 hover:underline">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        {/* Toolbar */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
            {(
              [
                { value: "" as const, label: "Tất cả đơn" },
                { value: "stock" as const, label: "Hàng kho" },
                { value: "prescription" as const, label: "Đơn kính" },
                { value: "pre_order" as const, label: "Pre-order" },
              ] satisfies { value: OrderKindFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => {
                  setOrderKind(opt.value);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  orderKind === opt.value ? "bg-[#2bb6a3] text-white shadow-sm" : "text-slate-600 hover:bg-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
            <select
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-teal-400 focus:outline-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {ORDER_STATUS_FILTER_VALUES.map((v) => (
                <option key={v || "all"} value={v}>{STATUS_LABELS[v] ?? v}</option>
              ))}
            </select>
          </div>

          {/* Rows per page */}
          <select
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-teal-400 focus:outline-none"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} / trang</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {ordersQuery.isPending && !ordersQuery.data ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody><TableSkeleton /></tbody>
            </table>
          </div>
        ) : ordersQuery.isError ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn hàng.")}
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">Chưa có đơn hàng.</p>
            <Link to="/" className="mt-2 text-sm font-medium text-teal-600 hover:underline">
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={cn("mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block", ordersQuery.isFetching && "opacity-70 transition-opacity")}>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Ngày đặt</th>
                    <th className="px-4 py-3">Tổng tiền</th>
                    <th className="px-4 py-3">Thanh toán</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((order, idx) => {
                    const oid = order._id ?? order.id ?? "";
                    const canCancel = canCustomerCancelOrder(order);
                    return (
                      <tr key={oid || idx} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500" title={oid}>
                          {shortId(oid)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fmtDate(order.created_at)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {fmtMoney(order.final_amount ?? order.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{payMethod(order)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusBadgeCls(order.status))}>
                            {STATUS_LABELS[(order.status ?? "").toLowerCase()] ?? order.status}
                          </span>
                          {String(order.order_type ?? "").toLowerCase() === "pre_order" ? (
                            <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              pre-order
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {oid && (
                              <Link
                                to={`/orders/${encodeURIComponent(oid)}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Chi tiết
                              </Link>
                            )}
                            {canCancel && oid && (
                              <button
                                type="button"
                                disabled={cancelMutation.isPending}
                                onClick={() => askCancelOrder(oid)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <X className="h-3.5 w-3.5" />
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={cn("mt-4 space-y-3 sm:hidden", ordersQuery.isFetching && "opacity-70 transition-opacity")}>
              {items.map((order, idx) => (
                <MobileCard
                  key={order._id ?? order.id ?? idx}
                  order={order}
                  cancelling={cancelMutation.isPending}
                  onCancel={askCancelOrder}
                />
              ))}
            </div>

            {/* Pagination */}
            {pg && pg.total_pages > 0 && (
              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-slate-500">
                  Trang <span className="font-semibold text-slate-800">{pg.page}</span> / {pg.total_pages} —{" "}
                  <span className="font-semibold text-slate-800">{pg.total}</span> đơn
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || ordersQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= pg.total_pages || ordersQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sau <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <ConfirmDialog
        open={Boolean(pendingCancelOrderId)}
        title="Xác nhận hủy đơn"
        description={
          <div className="space-y-3">
            <p>Bạn có chắc chắn muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác.</p>
            <div>
              <label htmlFor="cancel-reason-history" className="mb-1 block text-xs font-medium text-slate-700">
                Lý do hủy đơn
              </label>
              <textarea
                id="cancel-reason-history"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn..."
                className="min-h-[90px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-300"
                disabled={cancelMutation.isPending}
              />
            </div>
          </div>
        }
        confirmLabel="Xác nhận hủy"
        cancelLabel="Giữ lại đơn"
        loading={cancelMutation.isPending}
        onConfirm={confirmCancelOrder}
        onCancel={closeCancelDialog}
      />

      <SiteFooter />
    </div>
  );
}
