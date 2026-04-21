import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchMyOrders } from "@/services/order.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CustomerOrderListItem } from "@/types/order";
import { ORDER_STATUS_FILTER_VALUES } from "@/types/order";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

const LIMIT_OPTIONS = [10, 20, 50] as const;

const STATUS_LABELS: Record<string, string> = {
  "": "Tất cả trạng thái",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  manufacturing: "Đang gia công",
  packed: "Đã đóng gói",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  stock: "Có sẵn",
  preorder: "Đặt trước",
  prescription: "Kê đơn",
};

function formatMoneyVnd(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) {
    return "—";
  }
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

function formatDateVi(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortOrderId(id: string | undefined): string {
  if (!id) {
    return "—";
  }
  if (id.length <= 10) {
    return id;
  }
  return `…${id.slice(-8)}`;
}

function shortAddress(s: string | undefined, max = 52): string {
  if (!s) {
    return "—";
  }
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function paymentMethodLabel(method: string | undefined): string {
  if (!method) {
    return "—";
  }
  const m = method.toLowerCase();
  if (m === "momo") {
    return "MoMo";
  }
  if (m === "cod") {
    return "Khi nhận hàng";
  }
  return method;
}

function paymentStatusLabel(status: string | undefined): string {
  if (!status) {
    return "—";
  }
  const s = status.toLowerCase();
  if (s === "pending") {
    return "Chưa thanh toán";
  }
  if (s === "paid") {
    return "Đã thanh toán";
  }
  if (s === "failed") {
    return "Thất bại";
  }
  return status;
}

function orderStatusBadgeClass(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "cancelled") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (s === "completed" || s === "delivered") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (s === "shipped" || s === "packed") {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  if (s === "pending") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function OrdersTableSkeleton() {
  return (
    <div className="mt-6 space-y-3" aria-busy>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
      ))}
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrderListItem }) {
  const pay = order.payment;
  const typeKey = (order.order_type ?? "").toLowerCase();
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500">Mã đơn</p>
          <p className="font-semibold text-slate-900" title={order._id}>
            {shortOrderId(order._id)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
            orderStatusBadgeClass(order.status)
          )}
        >
          {STATUS_LABELS[(order.status ?? "").toLowerCase()] ?? order.status ?? "—"}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Ngày đặt</dt>
          <dd className="font-medium text-slate-800">{formatDateVi(order.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Loại đơn</dt>
          <dd className="font-medium text-slate-800">{ORDER_TYPE_LABELS[typeKey] ?? order.order_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Tổng tiền hàng</dt>
          <dd className="font-semibold text-[#2bb6a3]">{formatMoneyVnd(order.total_amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Phí giao hàng</dt>
          <dd className="font-medium text-slate-800">{formatMoneyVnd(order.shipping_fee)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Thanh toán</dt>
          <dd className="font-medium text-slate-800">
            {pay ? (
              <>
                {paymentMethodLabel(pay.method)} — <span className="text-slate-600">{paymentStatusLabel(pay.status)}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Địa chỉ</dt>
          <dd className="text-slate-700">{shortAddress(order.shipping_address)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function OrdersHistoryPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const isCustomer = user?.role === "customer";
  const lastErrorRef = useRef<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["orders", "my", page, limit, statusFilter],
    queryFn: () =>
      fetchMyOrders({
        page,
        limit,
        status: statusFilter || undefined,
      }),
    enabled: isCustomer,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!ordersQuery.isError || !ordersQuery.error) {
      return;
    }
    const msg = getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn hàng.");
    if (lastErrorRef.current !== msg) {
      lastErrorRef.current = msg;
      toast.error(msg);
    }
  }, [ordersQuery.isError, ordersQuery.error]);

  useEffect(() => {
    if (!ordersQuery.isError) {
      lastErrorRef.current = null;
    }
  }, [ordersQuery.isError]);

  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-white">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-900">Lịch sử đơn hàng</h1>
          <p className="mt-4 text-sm text-slate-600">
            Trang này chỉ dành cho tài khoản khách hàng. Nếu bạn là nhân viên hoặc quản trị, vui lòng dùng khu vực quản lý từ menu trên.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-[#2bb6a3] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-[0.98]"
          >
            Về trang chủ
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const data = ordersQuery.data;
  const items = data?.items ?? [];
  const pg = data?.pagination;

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đơn hàng của tôi</h1>
            <p className="mt-1 text-sm text-slate-600">Theo dõi đơn đã đặt và trạng thái giao hàng.</p>
          </div>
          <Link to="/" className="text-sm font-medium text-[#2bb6a3] hover:underline">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5 sm:min-w-[200px]">
            <Label htmlFor="order-status">Trạng thái đơn</Label>
            <select
              id="order-status"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              {ORDER_STATUS_FILTER_VALUES.map((v) => (
                <option key={v || "all"} value={v}>
                  {STATUS_LABELS[v] ?? v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:w-36">
            <Label htmlFor="order-limit">Số dòng / trang</Label>
            <select
              id="order-limit"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {ordersQuery.isPending && !ordersQuery.data ? (
          <OrdersTableSkeleton />
        ) : ordersQuery.isError ? (
          <p className="mt-10 rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
            {getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn hàng.")}
          </p>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
            <p className="text-slate-600">Chưa có đơn hàng.</p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-semibold text-[#2bb6a3] hover:underline"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <>
            <div className={cn("mt-6 space-y-4", ordersQuery.isFetching && "opacity-75 transition-opacity")}>
              {items.map((order, idx) => (
                <OrderCard key={order._id ?? `row-${idx}`} order={order} />
              ))}
            </div>

            {pg && pg.total_pages > 0 ? (
              <div className="mt-8 flex flex-col items-center gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
                <p className="text-sm text-slate-600">
                  Trang <span className="font-semibold text-slate-900">{pg.page}</span> / {pg.total_pages} —{" "}
                  <span className="font-semibold text-slate-900">{pg.total}</span> đơn
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1 || ordersQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= pg.total_pages || ordersQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
