import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCart } from "@/services/shop.service";
import { getApiErrorMessage } from "@/lib/api-error";
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
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
  });

  const rows = cartItemsArrayFromResponse(cartQuery.data);

  const total = useMemo(() => {
    return rows.reduce((acc, item) => {
      const row = cartRowRecord(item);
      return acc + cartLineUnitPrice(row) * cartLineQuantity(row);
    }, 0);
  }, [rows]);

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">Sản phẩm</h1>

        {cartQuery.isPending ? (
          <p className="mt-8 text-slate-600">Đang tải giỏ…</p>
        ) : cartQuery.isError ? (
          <p className="mt-8 text-red-600">{getApiErrorMessage(cartQuery.error, "Không tải được giỏ hàng.")}</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 p-8 text-center text-slate-600">
            <p>Giỏ hàng của bạn đang trống.</p>
            <Link
              to="/"
              className={cn(
                "mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition",
                "bg-[#2bb6a3] hover:brightness-[0.98]"
              )}
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="min-w-0">
              <div className="hidden grid-cols-[44px_1fr_120px_120px_120px] items-center border-b border-slate-200 pb-3 text-sm font-semibold text-slate-800 md:grid">
                <span className="grid place-items-center">
                  <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-slate-300 text-[#2bb6a3]" />
                </span>
                <span>Thông tin sản phẩm</span>
                <span className="text-center">Giá</span>
                <span className="text-center">Số lượng</span>
                <span className="text-right">Tổng cộng</span>
              </div>

              <ul className="divide-y divide-slate-100">
                {rows.map((item, i) => {
                  const row = cartRowRecord(item);
                  const key = String(row._id ?? row.id ?? i);
                  const name = cartLineProductName(row);
                  const varLabel = cartLineVariantLabel(row);
                  const img = cartLineImage(row);
                  const unit = cartLineUnitPrice(row);
                  const qty = cartLineQuantity(row);
                  const subtotal = unit * qty;
                  return (
                    <li key={key} className="grid gap-3 py-4 md:grid-cols-[44px_1fr_120px_120px_120px] md:items-center">
                      <span className="hidden md:grid md:place-items-center">
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-slate-300 text-[#2bb6a3]" />
                      </span>
                      <div className="flex min-w-0 gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
                          {img ? (
                            <img src={img} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">
                              Ảnh
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold uppercase leading-snug text-slate-900">{name}</p>
                          {varLabel ? <p className="mt-1 text-xs text-slate-600">{varLabel}</p> : null}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 md:text-center">{formatPriceVnd(unit)}</p>
                      <div className="inline-flex h-9 w-fit items-center border border-[#2bb6a3]/50 md:mx-auto">
                        <span className="w-8 text-center text-slate-500">-</span>
                        <span className="w-8 text-center text-sm font-medium text-slate-900">{qty}</span>
                        <span className="w-8 text-center text-[#2bb6a3]">+</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 md:text-right">{formatPriceVnd(subtotal)}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-slate-100 px-5 text-sm font-semibold text-slate-500"
                >
                  Xóa sản phẩm đã chọn
                </button>
                <Link
                  to="/"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-[#2bb6a3] px-6 text-sm font-semibold text-white transition hover:brightness-[0.98]"
                >
                  Tiếp tục mua hàng
                </Link>
              </div>
            </section>

            <aside className="h-fit border border-slate-200 bg-slate-50/30">
              <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900">Tóm tắt đơn hàng</h2>
              <div className="space-y-3 px-5 py-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tạm tính</span>
                  <span className="font-semibold text-slate-900">{formatPriceVnd(total)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-base font-semibold text-slate-900">Tổng</span>
                  <span className="text-2xl font-bold text-slate-900">{formatPriceVnd(total)}</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <Link
                  to="/checkout"
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-white transition",
                    "bg-[#2bb6a3] hover:brightness-[0.98]"
                  )}
                >
                  Thanh toán ngay
                </Link>
              </div>
            </aside>
          </div>
        )}

        {rows.length > 0 ? (
          <section className="mt-14">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-4xl font-bold uppercase tracking-wide text-slate-900">Sản phẩm có thể bạn quan tâm</h2>
              <Link to="/" className="text-sm font-medium text-slate-500 hover:text-[#2bb6a3]">
                Xem thêm
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.slice(0, 3).map((item, i) => {
                const row = cartRowRecord(item);
                const key = `suggest-${String(row._id ?? row.id ?? i)}`;
                const img = cartLineImage(row);
                const name = cartLineProductName(row);
                const price = cartLineUnitPrice(row);
                return (
                  <article key={key} className="border border-slate-200 bg-white p-3">
                    <div className="h-36 overflow-hidden bg-slate-50">
                      {img ? (
                        <img src={img} alt={name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="grid h-full place-items-center text-xs text-slate-400">Chưa có ảnh</span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold uppercase leading-snug text-slate-900">{name}</p>
                    <p className="mt-1 text-lg font-bold text-[#2bb6a3]">{formatPriceVnd(price)}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
