import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCart } from "@/services/shop.service";
import { postCheckout } from "@/services/order.service";
import { createMomoPayment } from "@/services/payment.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { OrderType, PaymentMethod, ShippingMethod } from "@/types/shop";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cartItemsArrayFromResponse } from "@/lib/cart-utils";
import {
  cartLineImage,
  cartLineProductName,
  cartLineQuantity,
  cartLineUnitPrice,
  cartLineVariantLabel,
  cartRowRecord,
  formatPriceVnd,
} from "@/lib/cart-line-display";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "stock", label: "Hàng có sẵn" },
  { value: "preorder", label: "Đặt trước" },
  { value: "prescription", label: "Kính kê đơn" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "momo", label: "Ví MoMo" },
  { value: "cod", label: "Thanh toán khi nhận hàng (COD)" },
];

const SHIPPING_METHODS: { value: ShippingMethod; label: string }[] = [
  { value: "ship", label: "Giao tận nơi (có phí giao hàng)" },
  { value: "pickup", label: "Nhận tại cửa hàng" },
];

const LOCATION_TREE: Record<string, Record<string, string[]>> = {
  "TP.HCM": {
    "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao"],
    "Quận Bình Thạnh": ["Phường 1", "Phường 2", "Phường 3"],
    "TP Thủ Đức": ["Phường An Khánh", "Phường Thảo Điền", "Phường Linh Tây"],
  },
  "Hà Nội": {
    "Quận Cầu Giấy": ["Phường Dịch Vọng", "Phường Nghĩa Đô", "Phường Quan Hoa"],
    "Quận Đống Đa": ["Phường Cát Linh", "Phường Láng Hạ", "Phường Ô Chợ Dừa"],
    "Quận Hai Bà Trưng": ["Phường Bạch Mai", "Phường Quỳnh Mai", "Phường Thanh Nhàn"],
  },
  "Đà Nẵng": {
    "Quận Hải Châu": ["Phường Hải Châu 1", "Phường Hòa Cường Bắc", "Phường Bình Hiên"],
    "Quận Thanh Khê": ["Phường An Khê", "Phường Chính Gián", "Phường Tân Chính"],
    "Quận Sơn Trà": ["Phường An Hải Bắc", "Phường Mân Thái", "Phường Nại Hiên Đông"],
  },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
  });
  const rows = cartItemsArrayFromResponse(cartQuery.data);
  const subtotal = useMemo(() => {
    return rows.reduce((sum, item) => {
      const row = cartRowRecord(item);
      return sum + cartLineUnitPrice(row) * cartLineQuantity(row);
    }, 0);
  }, [rows]);

  const [addressLine, setAddressLine] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("stock");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("ship");
  const [submitting, setSubmitting] = useState(false);

  const shippingFee = shippingMethod === "ship" ? 30000 : 0;
  const grandTotal = subtotal + shippingFee;
  const provinceOptions = Object.keys(LOCATION_TREE);
  const districtOptions = province ? Object.keys(LOCATION_TREE[province] ?? {}) : [];
  const wardOptions = province && district ? LOCATION_TREE[province]?.[district] ?? [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) {
      toast.error("Giỏ hàng đang trống, chưa thể thanh toán.");
      return;
    }
    if (!province || !district || !ward) {
      toast.error("Vui lòng chọn Tỉnh/Thành, Quận/Huyện và Phường/Xã.");
      return;
    }
    const addr = [addressLine.trim(), ward, district, province].filter(Boolean).join(", ");
    setSubmitting(true);
    try {
      const res = await postCheckout({
        shipping_address: addr,
        order_type: orderType,
        payment_method: paymentMethod,
        shipping_method: shippingMethod,
        items: [],
      });

      let payUrl = typeof res.payUrl === "string" ? res.payUrl.trim() : "";

      if (paymentMethod === "momo") {
        if (!payUrl && res.orderId) {
          try {
            const momo = await createMomoPayment({ orderId: res.orderId });
            payUrl = typeof momo.payUrl === "string" ? momo.payUrl.trim() : "";
          } catch {
            // fallback về thông báo thân thiện bên dưới
          }
        }
        if (payUrl.length > 0) {
          window.location.assign(payUrl);
          return;
        }
        toast.error(
          "Hiện không mở được trang thanh toán MoMo. Bạn thử lại sau hoặc chọn trả tiền khi nhận hàng. Nếu vẫn lỗi, vui lòng gọi hotline để được hỗ trợ."
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(res.message ?? "Đặt hàng thành công.");
      navigate("/order-success", {
        replace: true,
        state: { order: res.order, message: res.message },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Thanh toán thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-8">
            <section>
              <h1 className="text-4xl font-bold uppercase tracking-wide text-slate-900">Thông tin giao hàng</h1>
              <div className="mt-4 space-y-3">
                <Label htmlFor="address-line">Địa chỉ giao hàng</Label>
                <Input
                  id="address-line"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Số nhà, tên đường (không bắt buộc)"
                />
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setDistrict("");
                    setWard("");
                  }}
                >
                  <option value="">Chọn Tỉnh/Thành</option>
                  {provinceOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                  value={district}
                  disabled={!province}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setWard("");
                  }}
                >
                  <option value="">Chọn Quận/Huyện</option>
                  {districtOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                  value={ward}
                  disabled={!district}
                  onChange={(e) => setWard(e.target.value)}
                >
                  <option value="">Chọn Phường/Xã</option>
                  {wardOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <h2 className="text-4xl font-bold uppercase tracking-wide text-slate-900">Hình thức thanh toán</h2>
              <p className="mt-2 text-sm text-slate-500">Toàn bộ giao dịch được bảo mật và mã hóa</p>
              <div className="mt-4 space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition ${
                      paymentMethod === method.value ? "border-[#2bb6a3] bg-[#2bb6a3]/5" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="h-4 w-4 accent-[#2bb6a3]"
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                    />
                    <span className="font-medium text-slate-800">{method.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Loại đơn</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                >
                  {ORDER_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Giao hàng</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                >
                  {SHIPPING_METHODS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={submitting || rows.length === 0 || cartQuery.isPending}
                className="h-11 rounded-full bg-[#2bb6a3] px-8 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-[0.98]"
              >
                {submitting ? "Đang xử lý..." : paymentMethod === "momo" ? "Thanh toán bằng MoMo" : "Đặt hàng"}
              </Button>
              <Link
                to="/cart"
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Về giỏ hàng
              </Link>
            </div>
          </form>

          <aside className="h-fit bg-slate-50 px-5 py-6">
            <h2 className="text-4xl font-bold uppercase tracking-wide text-slate-900">Giỏ hàng ({rows.length})</h2>
            {cartQuery.isPending ? (
              <p className="mt-4 text-sm text-slate-600">Đang tải giỏ hàng...</p>
            ) : cartQuery.isError ? (
              <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(cartQuery.error, "Không tải được giỏ hàng.")}</p>
            ) : rows.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Giỏ hàng trống.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-4">
                  {rows.map((item, idx) => {
                    const row = cartRowRecord(item);
                    const key = String(row._id ?? row.id ?? idx);
                    const name = cartLineProductName(row);
                    const variant = cartLineVariantLabel(row);
                    const image = cartLineImage(row);
                    const quantity = cartLineQuantity(row);
                    const unitPrice = cartLineUnitPrice(row);
                    return (
                      <li key={key} className="border-b border-slate-200 pb-4">
                        <div className="flex gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden bg-white">
                            {image ? (
                              <img src={image} alt={name} className="h-full w-full object-contain" />
                            ) : (
                              <span className="grid h-full place-items-center text-[10px] text-slate-400">Ảnh</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold uppercase leading-snug text-slate-900">{name}</p>
                            {variant ? <p className="mt-1 text-xs text-slate-600">{variant}</p> : null}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-slate-700">+ {quantity}</span>
                              <span className="text-3xl font-bold text-slate-900">{formatPriceVnd(unitPrice * quantity)}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 border-b border-slate-200 pb-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Tạm tính</span>
                    <span className="font-semibold text-slate-900">{formatPriceVnd(subtotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-slate-700">Giảm giá</span>
                    <span className="font-semibold text-slate-900">0đ</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-slate-700">Phí giao hàng</span>
                    <span className="font-semibold text-slate-900">{formatPriceVnd(shippingFee)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-5xl font-bold uppercase tracking-wide text-slate-900">Tổng</span>
                  <span className="text-5xl font-bold text-slate-900">{formatPriceVnd(grandTotal)}</span>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
