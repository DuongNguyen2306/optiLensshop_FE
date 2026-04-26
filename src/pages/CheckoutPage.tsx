import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Province, District, Ward } from "sub-vn";
import { getCart } from "@/services/shop.service";
import { postCheckout } from "@/services/order.service";
import { createMomoPayment, createVnpayPayment } from "@/services/payment.service";
import { getMyAddresses } from "@/services/users.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { PaymentMethod, ShippingMethod } from "@/types/shop";
import type { UserAddress } from "@/types/user-profile";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hooks";
import { cartItemsArrayFromResponse } from "@/lib/cart-utils";
import {
  cartLineComboEntityId,
  cartLineImage,
  cartLineLensParams,
  cartLineProductName,
  cartLineQuantity,
  cartLineUnitPrice,
  cartLineSelectionKey,
  cartLineVariantEntityId,
  cartLineVariantLabel,
  cartRowRecord,
  formatPriceVnd,
} from "@/lib/cart-line-display";

// sub-vn được lazy-load khi checkout page mount, tránh bloat main bundle

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "momo", label: "Ví MoMo" },
  { value: "vnpay", label: "VNPay" },
  { value: "cod", label: "Thanh toán khi nhận hàng (COD)" },
];

const SHIPPING_METHODS: { value: ShippingMethod; label: string }[] = [
  { value: "ship", label: "Giao tận nơi (có phí giao hàng)" },
  { value: "pickup", label: "Nhận tại cửa hàng" },
];

function orderIdFromCheckoutOrder(order: unknown): string | null {
  if (!order || typeof order !== "object") {
    return null;
  }
  const rec = order as Record<string, unknown>;
  const raw = rec._id ?? rec.id ?? rec.orderId ?? rec.order_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function fullAddressFromUserAddress(addr: UserAddress): string {
  const fullFromParts = [addr.address_line, addr.ward, addr.district, addr.province].filter(Boolean).join(", ");
  const full = addr.address ?? addr.full_address ?? fullFromParts;
  return typeof full === "string" ? full.trim() : "";
}

function readProfilePhone(userLike: unknown): string {
  if (!userLike || typeof userLike !== "object") return "";
  const u = userLike as Record<string, unknown>;
  if (typeof u.phone === "string" && u.phone.trim()) return u.phone.trim();
  const profile = u.profile;
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (typeof p.phone === "string" && p.phone.trim()) return p.phone.trim();
  }
  return "";
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linesQueryValue = searchParams.get("lines");
  const queryClient = useQueryClient();
  const authUser = useAppSelector((s) => s.auth.user);
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
  });
  const addressesQuery = useQuery({
    queryKey: ["users", "my-addresses"],
    queryFn: () => getMyAddresses(),
  });
  const rows = cartItemsArrayFromResponse(cartQuery.data);

  const selectedLineKeySet = useMemo(() => {
    if (!linesQueryValue?.trim()) {
      return null as Set<string> | null;
    }
    return new Set(
      linesQueryValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }, [linesQueryValue]);

  const checkoutRows = useMemo(() => {
    if (!selectedLineKeySet) {
      return rows;
    }
    return rows.filter((item, idx) => selectedLineKeySet.has(cartLineSelectionKey(cartRowRecord(item), idx)));
  }, [rows, selectedLineKeySet]);

  const subtotal = useMemo<number>(() => {
    return checkoutRows.reduce<number>((sum, item) => {
      const row = cartRowRecord(item);
      return sum + cartLineUnitPrice(row) * cartLineQuantity(row);
    }, 0);
  }, [checkoutRows]);

  const [addressLine, setAddressLine] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  // Province
  const [allProvinces, setAllProvinces] = useState<Province[]>([]);
  const [provinceCode, setProvinceCode] = useState<string>("");
  const [provinceName, setProvinceName] = useState<string>("");

  // District
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtCode, setDistrictCode] = useState<string>("");
  const [districtName, setDistrictName] = useState<string>("");

  // Ward
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardName, setWardName] = useState<string>("");

  const [loadingAddress, setLoadingAddress] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("ship");
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");

  // Lazy-load sub-vn chỉ khi trang checkout mount → không ảnh hưởng main bundle
  useEffect(() => {
    void import("sub-vn").then((subVn) => {
      setAllProvinces(subVn.getProvinces());
      setLoadingAddress(false);
    });
  }, []);

  useEffect(() => {
    const addresses = addressesQuery.data ?? [];
    if (addresses.length === 0 || selectedAddress) {
      return;
    }
    const preferred = addresses.find((addr) => addr.is_default) ?? addresses[0];
    const full = fullAddressFromUserAddress(preferred);
    if (full) {
      setSelectedAddress(full);
      setShowAddressEditor(false);
    }
  }, [addressesQuery.data, selectedAddress]);

  useEffect(() => {
    if (!phone.trim()) {
      const profilePhone = readProfilePhone(authUser);
      if (profilePhone) {
        setPhone(profilePhone);
      }
    }
  }, [authUser, phone]);

  const handleProvinceChange = (code: string) => {
    import("sub-vn").then((subVn) => {
      const found = allProvinces.find((p) => p.code === code);
      setProvinceCode(code);
      setProvinceName(found?.name ?? "");
      setDistricts(code ? subVn.getDistrictsByProvinceCode(code) : []);
      setDistrictCode("");
      setDistrictName("");
      setWards([]);
      setWardName("");
    });
  };

  const handleDistrictChange = (code: string) => {
    import("sub-vn").then((subVn) => {
      const found = districts.find((d) => d.code === code);
      setDistrictCode(code);
      setDistrictName(found?.name ?? "");
      setWards(code ? subVn.getWardsByDistrictCode(code) : []);
      setWardName("");
    });
  };

  const shippingFee = shippingMethod === "ship" ? 30000 : 0;
  const grandTotal = subtotal + shippingFee;
  const customAddress = [addressLine.trim(), wardName, districtName, provinceName].filter(Boolean).join(", ");
  const usingCustomAddress = showAddressEditor || !selectedAddress;
  const fullAddress = usingCustomAddress ? customAddress : selectedAddress;
  const buildCheckoutItemsFromRows = (sourceRows: unknown[]) =>
    sourceRows
      .map((item) => {
        const row = cartRowRecord(item);
        const quantity = cartLineQuantity(row);
        const lensParams = cartLineLensParams(row);
        const comboId = cartLineComboEntityId(row);
        if (comboId) {
          return { combo_id: comboId, quantity, lens_params: lensParams };
        }
        const variantId = cartLineVariantEntityId(row);
        if (variantId) {
          return { variant_id: variantId, quantity, lens_params: lensParams };
        }
        return null;
      })
      .filter((x): x is { variant_id: string; quantity: number; lens_params?: Record<string, unknown> } | { combo_id: string; quantity: number; lens_params?: Record<string, unknown> } => x !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutRows.length === 0) {
      toast.error(
        selectedLineKeySet && selectedLineKeySet.size > 0
          ? "Không tìm thấy sản phẩm đã chọn trong giỏ. Vui lòng quay lại giỏ hàng."
          : "Giỏ hàng đang trống, chưa thể thanh toán."
      );
      return;
    }
    if (usingCustomAddress) {
      if (!provinceName) {
        toast.error("Vui lòng chọn Tỉnh/Thành phố.");
        return;
      }
      if (!districtName) {
        toast.error("Vui lòng chọn Quận/Huyện.");
        return;
      }
      if (!wardName) {
        toast.error("Vui lòng chọn Phường/Xã.");
        return;
      }
    } else if (!selectedAddress.trim()) {
      toast.error("Vui lòng chọn địa chỉ giao hàng.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Vui lòng chọn hình thức thanh toán.");
      return;
    }
    if (!/^\d{9,11}$/.test(phone.trim())) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (9-11 số).");
      return;
    }
    const checkoutItems = buildCheckoutItemsFromRows(checkoutRows);
    if (checkoutItems.length !== checkoutRows.length) {
      toast.error("Giỏ hàng có dòng dữ liệu lỗi (thiếu variant/combo id). Vui lòng xóa dòng lỗi và thử lại.");
      return;
    }
    setSubmitting(true);
    try {
      const freshCart = await getCart();
      const freshRows = cartItemsArrayFromResponse(freshCart);
      if (freshRows.length === 0) {
        toast.error("Giỏ hàng trống hoặc đã thay đổi theo phiên đăng nhập hiện tại. Vui lòng thêm sản phẩm lại.");
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const freshCheckoutRows = selectedLineKeySet
        ? freshRows.filter((item, idx) => selectedLineKeySet.has(cartLineSelectionKey(cartRowRecord(item), idx)))
        : freshRows;
      if (freshCheckoutRows.length === 0) {
        toast.error("Các sản phẩm đã chọn không còn trong giỏ. Vui lòng quay lại giỏ hàng.");
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const freshCheckoutItems = buildCheckoutItemsFromRows(freshCheckoutRows);
      if (freshCheckoutItems.length !== freshCheckoutRows.length) {
        toast.error("Có item trong giỏ không hợp lệ (thiếu variant_id/combo_id). Vui lòng kiểm tra lại giỏ hàng.");
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const res = await postCheckout({
        shipping_address: fullAddress,
        phone: phone.trim(),
        payment_method: paymentMethod,
        shipping_method: shippingMethod,
        items: freshCheckoutItems,
      });

      let payUrl = typeof res.payUrl === "string" ? res.payUrl.trim() : "";

      if (paymentMethod === "momo" || paymentMethod === "vnpay") {
        if (!payUrl && res.orderId) {
          try {
            if (paymentMethod === "momo") {
              const momo = await createMomoPayment({ orderId: res.orderId });
              payUrl = typeof momo.payUrl === "string" ? momo.payUrl.trim() : "";
            } else {
              const vnpay = await createVnpayPayment({ orderId: res.orderId });
              payUrl = typeof vnpay.payUrl === "string" ? vnpay.payUrl.trim() : "";
            }
          } catch {
            // fallback về thông báo thân thiện bên dưới
          }
        }
        if (payUrl.length > 0) {
          window.location.assign(payUrl);
          return;
        }
        toast.error(
          paymentMethod === "momo"
            ? "Hiện không mở được trang thanh toán MoMo. Bạn thử lại sau hoặc chọn trả tiền khi nhận hàng. Nếu vẫn lỗi, vui lòng gọi hotline để được hỗ trợ."
            : "Hiện không mở được trang thanh toán VNPay. Bạn thử lại sau hoặc chọn trả tiền khi nhận hàng. Nếu vẫn lỗi, vui lòng gọi hotline để được hỗ trợ."
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      const orderId = res.orderId ?? orderIdFromCheckoutOrder(res.order);
      toast.success(res.message ?? "Đặt hàng thành công.");
      navigate(orderId ? `/orders/${encodeURIComponent(orderId)}` : "/orders", { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Đặt hàng thất bại. Vui lòng thử lại."));
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
                <Label htmlFor="checkout-phone">Số điện thoại nhận hàng</Label>
                <Input
                  id="checkout-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                />
                <Label>Địa chỉ giao hàng</Label>
                {addressesQuery.isPending ? (
                  <p className="text-sm text-slate-500">Đang tải địa chỉ của bạn...</p>
                ) : null}
                {!usingCustomAddress && selectedAddress ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-800">{selectedAddress}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {!usingCustomAddress && selectedAddress ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddressEditor(true)}
                      className="h-9 rounded-full"
                    >
                      Chọn địa chỉ khác
                    </Button>
                  ) : null}
                  {usingCustomAddress && selectedAddress ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddressEditor(false)}
                      className="h-9 rounded-full"
                    >
                      Dùng địa chỉ mặc định
                    </Button>
                  ) : null}
                </div>
                {usingCustomAddress ? (
                  <>
                    <Input
                      id="address-line"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Số nhà, tên đường"
                    />
                    {/* Tỉnh / Thành phố */}
                    <select
                      className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      value={provinceCode}
                      disabled={loadingAddress}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                    >
                      <option value="">
                        {loadingAddress ? "Đang tải dữ liệu..." : "Chọn Tỉnh / Thành phố"}
                      </option>
                      {allProvinces.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {/* Quận / Huyện */}
                    <select
                      className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      value={districtCode}
                      disabled={!provinceCode}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      <option value="">Chọn Quận / Huyện</option>
                      {districts.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    {/* Phường / Xã */}
                    <select
                      className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      value={wardName}
                      disabled={!districtCode}
                      onChange={(e) => setWardName(e.target.value)}
                    >
                      <option value="">Chọn Phường / Xã</option>
                      {wards.map((w) => (
                        <option key={w.code} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
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
              {paymentMethod === "momo" || paymentMethod === "vnpay" ? (
                <p className="mt-3 text-sm text-slate-600">Sau khi xác nhận đơn, hệ thống sẽ chuyển bạn sang cổng thanh toán để hoàn tất giao dịch.</p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Bạn thanh toán khi nhận hàng (COD), không cần chuyển sang cổng thanh toán.</p>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
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
                disabled={submitting || checkoutRows.length === 0 || cartQuery.isPending}
                className="h-11 rounded-full bg-[#2bb6a3] px-8 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-[0.98]"
              >
                {submitting
                  ? "Đang đặt hàng..."
                  : paymentMethod === "momo"
                    ? "Thanh toán bằng MoMo"
                    : paymentMethod === "vnpay"
                      ? "Thanh toán bằng VNPay"
                      : "Đặt hàng (COD)"}
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
            <h2 className="text-4xl font-bold uppercase tracking-wide text-slate-900">
              Giỏ hàng ({checkoutRows.length}
              {selectedLineKeySet ? ` / ${rows.length}` : ""})
            </h2>
            {cartQuery.isPending ? (
              <p className="mt-4 text-sm text-slate-600">Đang tải giỏ hàng...</p>
            ) : cartQuery.isError ? (
              <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(cartQuery.error, "Không tải được giỏ hàng.")}</p>
            ) : rows.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Giỏ hàng trống.</p>
            ) : checkoutRows.length === 0 ? (
              <p className="mt-4 text-sm text-amber-800">
                Không có dòng nào khớp lựa chọn.{" "}
                <Link to="/cart" className="font-semibold text-[#2bb6a3] underline">
                  Quay lại giỏ hàng
                </Link>
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-4">
                  {checkoutRows.map((item, idx) => {
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
                  <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Thông tin giao hàng</p>
                    <p className="mt-1">{fullAddress || "Chưa nhập địa chỉ"}</p>
                    <p className="mt-1">
                      Thanh toán: {paymentMethod === "cod" ? "COD" : paymentMethod === "vnpay" ? "VNPay" : "MoMo"} | Vận chuyển:{" "}
                      {shippingMethod === "ship" ? "Giao tận nơi" : "Nhận tại cửa hàng"}
                    </p>
                  </div>
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
