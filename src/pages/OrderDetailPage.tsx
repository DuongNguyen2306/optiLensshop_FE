import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, PhoneCall } from "lucide-react";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { canCustomerCancelOrder, orderReadableStatus } from "@/lib/order-utils";
import { cancelMyOrder, fetchMyOrderDetail } from "@/services/order.service";
import { createMyAddress } from "@/services/users.service";
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

function paymentPhase(order: CustomerOrderListItem | null): string {
  if (!order || typeof order !== "object") return "";
  const raw = (order as Record<string, unknown>).payment_phase;
  return typeof raw === "string" ? raw : "";
}

const COMPACT_TIMELINE = [
  { key: "ordered", label: "Đã đặt hàng" },
  { key: "preparing", label: "Đang chuẩn bị" },
  { key: "shipping", label: "Đang giao" },
  { key: "success", label: "Thành công" },
] as const;

function compactTimelineIndex(status: string): number {
  const s = status.toLowerCase();
  if (s === "pending") return 0;
  if (
    s === "confirmed" ||
    s === "processing" ||
    s === "fulfilled" ||
    s === "manufacturing" ||
    s === "received" ||
    s === "packed"
  )
    return 1;
  if (s === "shipped" || s === "shipping") return 2;
  if (s === "delivered" || s === "completed" || s === "return_requested" || s === "returned" || s === "refunded")
    return 3;
  return 0;
}

function lensParamValue(raw: unknown): string {
  if (raw == null) return "—";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "—";
}

function lensParamsCard(params: Record<string, unknown> | undefined) {
  if (!params) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const sphR = lensParamValue(params.sph_right ?? params.right_sph ?? params.sphR);
  const cylR = lensParamValue(params.cyl_right ?? params.right_cyl ?? params.cylR);
  const axR = lensParamValue(params.axis_right ?? params.right_axis ?? params.axR);
  const sphL = lensParamValue(params.sph_left ?? params.left_sph ?? params.sphL);
  const cylL = lensParamValue(params.cyl_left ?? params.left_cyl ?? params.cylL);
  const axL = lensParamValue(params.axis_left ?? params.left_axis ?? params.axL);
  const pd = lensParamValue(params.pd ?? params.pupillary_distance);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-700">
      <p className="font-mono">Phải (R): SPH {sphR}, CYL {cylR}, AX {axR}</p>
      <p className="font-mono">Trái (L): SPH {sphL}, CYL {cylL}, AX {axL}</p>
      <p className="font-mono">PD: {pd} mm</p>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [openAddressModal, setOpenAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [localShippingAddress, setLocalShippingAddress] = useState("");

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
  const addAddressMutation = useMutation({
    mutationFn: (address: string) => createMyAddress({ address }),
    onSuccess: () => {
      setLocalShippingAddress(newAddress.trim());
      setOpenAddressModal(false);
      setNewAddress("");
      toast.success("Đã lưu địa chỉ nhận hàng mới.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật địa chỉ.")),
  });

  const order = useMemo(() => readOrderFromDetail(detailQuery.data), [detailQuery.data]);
  const oid = readOrderId(order);
  const items = readOrderItems(order);
  const canCancel = canCustomerCancelOrder(order);
  const pay = paymentInfo(order);
  const currentStatus = String(order?.status ?? "").toLowerCase();
  const timelineIndex = compactTimelineIndex(currentStatus);
  const isPreOrder = String(order?.order_type ?? "").toLowerCase() === "pre_order";
  const payPhase = paymentPhase(order);
  const rawShippingAddress = shippingAddress(order);
  const shippingAddressDisplay = localShippingAddress || rawShippingAddress;
  const missingShippingAddress = isPreOrder && rawShippingAddress.toLowerCase() === "khách hàng cập nhật sau";

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
              {isPreOrder ? (
                <p className="mb-3 inline-flex rounded-full bg-teal-600 px-3 py-1 text-xs font-bold tracking-wide text-white">
                  ĐƠN HÀNG ĐẶT TRƯỚC
                </p>
              ) : null}
              <h1 className="text-xl font-bold text-slate-900">Đơn #{oid || "—"}</h1>
              {isPreOrder ? (
                <p className="mt-2 inline-flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
                  <PhoneCall className="mt-0.5 h-4 w-4 animate-bounce" />
                  Cảm ơn bạn! Yêu cầu của bạn đã được tiếp nhận. Chuyên viên sẽ gọi điện xác nhận thông số kỹ thuật trong
                  vòng 15-30 phút.
                </p>
              ) : null}
              {isPreOrder && payPhase ? (
                <p className="mt-2 text-xs text-slate-600">
                  Giai đoạn thanh toán hiện tại: <span className="font-semibold text-slate-800">{payPhase}</span>
                </p>
              ) : null}
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
              {missingShippingAddress ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    className="rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => setOpenAddressModal(true)}
                  >
                    Cập nhật địa chỉ nhận hàng ngay
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-700">
                  <span className="text-slate-500">Địa chỉ giao hàng: </span>
                  {shippingAddressDisplay}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
              <div className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:gap-x-2">
                {COMPACT_TIMELINE.map((step, idx) => {
                  const done = idx < timelineIndex;
                  const processing = idx === timelineIndex;
                  const active = done || processing;
                  return (
                    <div key={step.key} className="relative px-1 text-center">
                      {idx < COMPACT_TIMELINE.length - 1 ? (
                        <span
                          className={`absolute left-[calc(50%+14px)] top-2.5 hidden h-[1px] w-[calc(100%-14px)] sm:block ${
                            done ? "bg-teal-500" : "bg-slate-200"
                          }`}
                        />
                      ) : null}
                      <div className="mx-auto flex h-5 w-5 items-center justify-center">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-teal-600" />
                        ) : processing ? (
                          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <p className={`mt-1 text-xs font-medium ${active ? "text-teal-700" : "text-slate-500"}`}>{step.label}</p>
                      {isPreOrder && step.key === "preparing" ? (
                        <p className="mt-1 text-[11px] text-slate-500">Mài lắp tròng kính, kiểm định QC</p>
                      ) : null}
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
                              {lensParamsCard(item.lens_params)}
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
      {openAddressModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Cập nhật địa chỉ nhận hàng</h3>
            <p className="mt-1 text-sm text-slate-600">
              Địa chỉ này sẽ được lưu vào sổ địa chỉ để Sales liên hệ xác nhận giao hàng.
            </p>
            <textarea
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
              className="mt-3 min-h-[110px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddressModal(false)}>
                Hủy
              </Button>
              <Button
                type="button"
                className="bg-amber-500 text-white hover:bg-amber-600"
                disabled={addAddressMutation.isPending}
                onClick={() => {
                  const val = newAddress.trim();
                  if (!val) {
                    toast.error("Vui lòng nhập địa chỉ nhận hàng.");
                    return;
                  }
                  addAddressMutation.mutate(val);
                }}
              >
                {addAddressMutation.isPending ? "Đang lưu..." : "Lưu địa chỉ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <SiteFooter />
    </div>
  );
}
