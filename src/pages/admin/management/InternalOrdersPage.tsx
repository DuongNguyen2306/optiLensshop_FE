import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { nextOpsStatuses, orderReadableStatus } from "@/lib/order-utils";
import { confirmOrder, fetchAllOrders, updateOrderStatus } from "@/services/order.service";
import { useAppSelector } from "@/store/hooks";
import type { CustomerOrderListItem } from "@/types/order";

function toOrderArray(data: unknown): CustomerOrderListItem[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) {
    return o.items as CustomerOrderListItem[];
  }
  if (Array.isArray(o.data)) {
    return o.data as CustomerOrderListItem[];
  }
  if (Array.isArray(o.orders)) {
    return o.orders as CustomerOrderListItem[];
  }
  return [];
}

function toPagination(
  data: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackRows: number
): { page: number; total_pages: number; total: number } {
  const readNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) {
        return n;
      }
    }
    return null;
  };

  if (!data || typeof data !== "object") {
    return { page: fallbackPage, total_pages: 1, total: fallbackRows };
  }
  const o = data as Record<string, unknown>;
  const pg =
    (o.pagination && typeof o.pagination === "object" ? (o.pagination as Record<string, unknown>) : null) ??
    (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : null) ??
    null;

  const rootPage = readNum(o.page) ?? readNum(o.current_page) ?? readNum(o.currentPage);
  const rootLimit = readNum(o.limit) ?? readNum(o.page_size) ?? readNum(o.pageSize) ?? readNum(o.per_page);
  const rootTotal = readNum(o.total) ?? readNum(o.total_items) ?? readNum(o.totalItems) ?? readNum(o.count);
  const rootTotalPages = readNum(o.total_pages) ?? readNum(o.totalPages) ?? readNum(o.pages) ?? readNum(o.last_page);

  if (!pg) {
    const total = rootTotal ?? fallbackRows;
    const limit = rootLimit ?? fallbackLimit;
    const totalPages = rootTotalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
    return {
      page: rootPage ?? fallbackPage,
      total_pages: totalPages,
      total,
    };
  }

  const p = pg;
  const page =
    readNum(p.page) ?? readNum(p.current_page) ?? readNum(p.currentPage) ?? rootPage ?? fallbackPage;
  const limit =
    readNum(p.limit) ??
    readNum(p.page_size) ??
    readNum(p.pageSize) ??
    readNum(p.per_page) ??
    rootLimit ??
    fallbackLimit;
  const total =
    readNum(p.total) ?? readNum(p.total_items) ?? readNum(p.totalItems) ?? rootTotal ?? fallbackRows;
  const totalPages =
    readNum(p.total_pages) ??
    readNum(p.totalPages) ??
    readNum(p.pages) ??
    readNum(p.last_page) ??
    rootTotalPages ??
    Math.max(1, Math.ceil(total / Math.max(1, limit)));

  return {
    page,
    total_pages: totalPages,
    total,
  };
}

function readOrderId(order: CustomerOrderListItem): string {
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}

function readPaymentMethod(order: CustomerOrderListItem): string {
  const pay = order.payment as Record<string, unknown> | undefined;
  return String(pay?.method ?? "").toLowerCase();
}

function readPaymentStatus(order: CustomerOrderListItem): string {
  const pay = order.payment as Record<string, unknown> | undefined;
  return String(pay?.status ?? "").toLowerCase();
}

function readCustomerLabel(order: CustomerOrderListItem): string {
  const user = order.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (typeof u.email === "string" && u.email.trim()) {
      return u.email.trim();
    }
  }
  if (typeof order.user_id === "string" && order.user_id.trim()) {
    return order.user_id.trim();
  }
  return "—";
}

function formatMoney(amount: number | undefined): string {
  if (!Number.isFinite(amount ?? NaN)) {
    return "—";
  }
  return `${Math.round(amount ?? 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("vi-VN");
}

const STATUS_OPTIONS = [
  "",
  "pending",
  "confirmed",
  "processing",
  "received",
  "manufacturing",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
];
const PAYMENT_METHOD_OPTIONS = ["", "cod", "momo"];
const PAYMENT_STATUS_OPTIONS = ["", "pending", "paid", "failed", "cancelled", "refunded"];

export default function InternalOrdersPage() {
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => (s.auth.user?.role ?? "").toLowerCase());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [confirmState, setConfirmState] = useState<{
    orderId: string;
    mode: "sales_confirm" | "sales_reject" | "ops_status";
    title: string;
    description?: string;
    targetStatus?: string;
    statusOptions?: string[];
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSales = role === "sales";
  const isOps = role === "operations";

  const ordersQuery = useQuery({
    queryKey: ["orders", "all", page, limit, status, paymentMethod, paymentStatus],
    queryFn: () =>
      fetchAllOrders({
        page,
        limit,
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        payment_status: paymentStatus || undefined,
      }),
  });

  const rows = useMemo(() => toOrderArray(ordersQuery.data), [ordersQuery.data]);
  const pagination = useMemo(
    () => toPagination(ordersQuery.data, page, limit, rows.length),
    [ordersQuery.data, page, limit, rows.length]
  );

  const confirmMutation = useMutation({
    mutationFn: (payload: { orderId: string; action: "confirm" | "reject"; reason?: string }) =>
      confirmOrder(payload.orderId, { action: payload.action, reason: payload.reason }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái xác nhận đơn.");
      queryClient.invalidateQueries({ queryKey: ["orders", "all"] });
      setConfirmState(null);
      setRejectReason("");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể xác nhận/từ chối đơn.")),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: string }) =>
      updateOrderStatus(payload.orderId, { status: payload.status }),
    onSuccess: () => {
      toast.success("Cập nhật trạng thái vận hành thành công.");
      queryClient.invalidateQueries({ queryKey: ["orders", "all"] });
      setConfirmState(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật trạng thái đơn.")),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng nội bộ</h1>
        <p className="mt-1 text-sm text-slate-600">Dành cho sales, operations, manager, admin.</p>
      </div>

      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label>Trạng thái đơn</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? orderReadableStatus(s) : "Tất cả"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Payment method</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
          >
            {PAYMENT_METHOD_OPTIONS.map((v) => (
              <option key={v || "all"} value={v}>
                {v || "Tất cả"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Payment status</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            {PAYMENT_STATUS_OPTIONS.map((v) => (
              <option key={v || "all"} value={v}>
                {v || "Tất cả"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Page size</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Trang</Label>
          <Input value={String(page)} readOnly />
        </div>
      </div>

      {ordersQuery.isPending ? (
        <p className="text-slate-600">Đang tải danh sách đơn…</p>
      ) : ordersQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn nội bộ.")}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          Không có đơn hàng phù hợp bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const id = readOrderId(order);
                const statusValue = String(order.status ?? "").toLowerCase();
                const payMethod = readPaymentMethod(order);
                const payStatus = readPaymentStatus(order);
                const nextStatuses = nextOpsStatuses(statusValue);
                return (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{id || "—"}</td>
                    <td className="px-4 py-3">{readCustomerLabel(order)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(order.final_amount ?? order.total_amount)}
                    </td>
                    <td className="px-4 py-3">{orderReadableStatus(order.status)}</td>
                    <td className="px-4 py-3">{[payMethod || "—", payStatus || "—"].join(" / ")}</td>
                    <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {isSales && statusValue === "pending" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 bg-[#2bb6a3] px-3 text-xs"
                              onClick={() =>
                                setConfirmState({
                                  orderId: id,
                                  mode: "sales_confirm",
                                  title: "Xác nhận đơn?",
                                  description: "Sau khi xác nhận, đơn sẽ chuyển sang bước tiếp theo của vận hành.",
                                })
                              }
                            >
                              Xác nhận
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-200 px-3 text-xs text-red-700"
                              onClick={() => {
                                setRejectReason("");
                                setConfirmState({
                                  orderId: id,
                                  mode: "sales_reject",
                                  title: "Từ chối đơn?",
                                  description: "Nhập lý do từ chối để gửi lên backend (nếu backend hỗ trợ).",
                                });
                              }}
                            >
                              Từ chối
                            </Button>
                          </>
                        ) : null}

                        {isOps && nextStatuses.length > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                            onClick={() => {
                              const first = nextStatuses[0];
                              setConfirmState({
                                orderId: id,
                                mode: "ops_status",
                                title: `Chuyển trạng thái sang "${orderReadableStatus(first)}"?`,
                                description: "Hành động này sẽ cập nhật trạng thái vận hành của đơn.",
                                targetStatus: first,
                                statusOptions: nextStatuses,
                              });
                            }}
                          >
                            Cập nhật trạng thái
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Tổng: <span className="font-semibold text-slate-900">{pagination.total}</span> đơn
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || ordersQuery.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pagination.total_pages || ordersQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        description={
          <div className="space-y-3">
            <p>{confirmState?.description}</p>
            {confirmState?.title.toLowerCase().includes("từ chối") ? (
              <div className="space-y-1">
                <Label>Lý do từ chối</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do (optional)"
                />
              </div>
            ) : null}
            {confirmState?.title.toLowerCase().includes("chuyển trạng thái") ? (
              <div className="space-y-1">
                <Label>Trạng thái mới</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={confirmState.targetStatus ?? ""}
                  onChange={(e) =>
                    setConfirmState((prev) =>
                      prev
                        ? {
                            ...prev,
                            targetStatus: e.target.value,
                          }
                        : prev
                    )
                  }
                >
                  {(confirmState.statusOptions ?? []).map((s) => (
                    <option key={s} value={s}>
                      {orderReadableStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        }
        confirmLabel="Xác nhận"
        loading={confirmMutation.isPending || statusMutation.isPending}
        onCancel={() => {
          setConfirmState(null);
          setRejectReason("");
        }}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }
          if (confirmState.mode === "sales_confirm") {
            confirmMutation.mutate({ orderId: confirmState.orderId, action: "confirm" });
            return;
          }
          if (confirmState.mode === "sales_reject") {
            confirmMutation.mutate({
              orderId: confirmState.orderId,
              action: "reject",
              reason: rejectReason.trim() || undefined,
            });
            return;
          }
          if (confirmState.mode === "ops_status" && confirmState.targetStatus) {
            statusMutation.mutate({ orderId: confirmState.orderId, status: confirmState.targetStatus });
          }
        }}
      />
    </div>
  );
}
