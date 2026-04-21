import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { canCustomerCancelOrder, orderReadableStatus } from "@/lib/order-utils";
import { cancelMyOrder, fetchMyOrderDetail } from "@/services/order.service";
import type { CustomerOrderListItem, OrderLineItem } from "@/types/order";

function readOrderFromDetail(data: unknown): CustomerOrderListItem | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const o = data as Record<string, unknown>;
  if (o.order && typeof o.order === "object") {
    return o.order as CustomerOrderListItem;
  }
  return data as CustomerOrderListItem;
}

function readOrderId(order: CustomerOrderListItem | null): string {
  if (!order) {
    return "";
  }
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}

function readOrderItems(order: CustomerOrderListItem | null): OrderLineItem[] {
  if (!order) {
    return [];
  }
  const items = order.items;
  if (Array.isArray(items)) {
    return items;
  }
  const alt = (order as Record<string, unknown>).order_items;
  if (Array.isArray(alt)) {
    return alt as OrderLineItem[];
  }
  return [];
}

function getItemDisplayName(item: OrderLineItem): string {
  // variant_id có thể đã được populate với dữ liệu sản phẩm
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    const prod = v.product_id as Record<string, unknown> | undefined;
    if (prod?.name && typeof prod.name === "string") return prod.name;
    if (v.name && typeof v.name === "string") return v.name;
    if (v.sku && typeof v.sku === "string") return `SKU: ${String(v.sku)}`;
  }
  // combo_id có thể đã được populate
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    if (c.name && typeof c.name === "string") return c.name;
  }
  // Tên trực tiếp nếu có
  if (typeof item.name === "string" && item.name) return item.name;
  if (typeof item.product_name === "string" && item.product_name) return item.product_name;
  // Fallback: hiển thị loại + ID ngắn
  const rawId = String(item._id ?? item.id ?? "");
  const shortId = rawId.length > 10 ? `…${rawId.slice(-8)}` : rawId;
  const isCombo = Boolean(item.combo_id);
  return isCombo ? `Combo #${shortId}` : `Sản phẩm #${shortId}`;
}

function formatMoney(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
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

function shippingAddress(order: CustomerOrderListItem | null): string {
  if (!order) {
    return "—";
  }
  const raw = order.shipping_address;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  const fromOrder = (order as Record<string, unknown>).shipping_address;
  if (fromOrder && typeof fromOrder === "object") {
    return JSON.stringify(fromOrder);
  }
  return "—";
}

function paymentInfo(order: CustomerOrderListItem | null): { method: string; status: string } {
  if (!order?.payment || typeof order.payment !== "object") {
    return { method: "—", status: "—" };
  }
  const p = order.payment as Record<string, unknown>;
  return {
    method: typeof p.method === "string" && p.method ? p.method : "—",
    status: typeof p.status === "string" && p.status ? p.status : "—",
  };
}

const CUSTOMER_TIMELINE = [
  "pending",
  "confirmed",
  "processing",
  "manufacturing",
  "received",
  "packed",
  "shipped",
  "delivered",
  "completed",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["orders", "detail", id],
    enabled: Boolean(id),
    queryFn: () => fetchMyOrderDetail(id as string),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => cancelMyOrder(orderId),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu hủy đơn.");
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể hủy đơn.")),
  });

  const order = useMemo(() => readOrderFromDetail(detailQuery.data), [detailQuery.data]);
  const oid = readOrderId(order);
  const items = readOrderItems(order);
  const canCancel = canCustomerCancelOrder(order);
  const pay = paymentInfo(order);
  const currentStatus = String(order?.status ?? "").toLowerCase();
  const timelineIndex = CUSTOMER_TIMELINE.indexOf(currentStatus);

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/orders" className="text-sm font-medium text-[#2bb6a3] hover:underline">
            ← Quay lại danh sách đơn
          </Link>
          {canCancel && oid ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(oid)}
            >
              {cancelMutation.isPending ? "Đang hủy…" : "Hủy đơn"}
            </Button>
          ) : null}
        </div>

        {detailQuery.isPending ? (
          <p className="text-slate-600">Đang tải chi tiết đơn hàng…</p>
        ) : detailQuery.isError || !order ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getApiErrorMessage(detailQuery.error, "Không tải được chi tiết đơn hàng.")}
          </p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h1 className="text-xl font-bold text-slate-900">Đơn #{oid || "—"}</h1>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="text-slate-500">Trạng thái: </span>
                  <strong>{orderReadableStatus(order.status)}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Ngày đặt: </span>
                  <strong>{formatDate(order.created_at)}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Thanh toán: </span>
                  <strong>{pay.method} / {pay.status}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Tổng tiền: </span>
                  <strong>{formatMoney(order.final_amount ?? order.total_amount)}</strong>
                </p>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                <span className="text-slate-500">Địa chỉ giao hàng: </span>
                {shippingAddress(order)}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {CUSTOMER_TIMELINE.map((s, idx) => {
                  const active = timelineIndex >= idx && timelineIndex !== -1;
                  return (
                    <div
                      key={s}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        active ? "border-[#2bb6a3] bg-[#2bb6a3]/10 text-[#2bb6a3]" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {orderReadableStatus(s)}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Danh sách sản phẩm</h2>
              {items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">Không có dữ liệu dòng hàng.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Số lượng</th>
                        <th className="px-3 py-2">Đơn giá</th>
                        <th className="px-3 py-2">Thành tiền</th>
                        <th className="px-3 py-2">Lens params</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const itemKey = String(item._id ?? item.id ?? idx);
                        const qty = Number(item.quantity ?? 1);
                        const unitPrice = typeof item.unit_price === "number" ? item.unit_price : undefined;
                        const lineTotal = typeof item.total_price === "number"
                          ? item.total_price
                          : unitPrice != null ? unitPrice * qty : undefined;
                        return (
                          <tr key={itemKey} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 text-sm text-slate-800">{getItemDisplayName(item)}</td>
                            <td className="px-3 py-2">{qty}</td>
                            <td className="px-3 py-2">{formatMoney(unitPrice)}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{formatMoney(lineTotal)}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {item.lens_params ? JSON.stringify(item.lens_params) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
