import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import LensParamsEditor from "@/components/cart/LensParamsEditor";
import {
  clearCart,
  deleteCartComboItem,
  deleteCartItem,
  getCart,
  updateCartComboItem,
  updateCartItem,
} from "@/services/shop.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { cartItemsArrayFromResponse } from "@/lib/cart-utils";
import {
  cartLineComboId,
  cartLineId,
  cartLineLensParams,
  cartLineQuantity,
  cartLineVariantLabel,
  cartRowRecord,
  formatPriceVnd,
  getCartItemDisplayName,
  getCartItemImage,
  getCartItemUnitPrice,
  isCartItemMissingPriceData,
  isComboItem,
} from "@/lib/cart-line-display";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { cn } from "@/lib/utils";
import type { LensParams } from "@/types/shop";

export default function CartPage() {
  const queryClient = useQueryClient();
  const [lineLoading, setLineLoading] = useState<Record<string, boolean>>({});
  const [lineError, setLineError] = useState<Record<string, string | null>>({});
  const [editingLensKey, setEditingLensKey] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
  });

  const rows = cartItemsArrayFromResponse(cartQuery.data);

  const total = useMemo<number>(() => {
    return rows.reduce<number>((acc, item) => {
      const row = cartRowRecord(item);
      return acc + getCartItemUnitPrice(row) * cartLineQuantity(row);
    }, 0);
  }, [rows]);

  const setLineBusy = (key: string, busy: boolean) =>
    setLineLoading((prev) => ({
      ...prev,
      [key]: busy,
    }));

  const setLineMessage = (key: string, message: string | null) =>
    setLineError((prev) => ({
      ...prev,
      [key]: message,
    }));

  const patchLine = async (row: Record<string, unknown>, quantity: number, lensParams?: LensParams | null) => {
    const comboId = cartLineComboId(row);
    const itemId = cartLineId(row);
    const key = String(comboId || itemId || row._id || row.id || "");

    if (!comboId && !itemId) {
      toast.error("Không xác định được dòng hàng. Vui lòng tải lại trang.");
      return;
    }
    if (quantity < 1) {
      toast.error("Số lượng tối thiểu là 1.");
      return;
    }
    setLineBusy(key, true);
    setLineMessage(key, null);
    try {
      const payload = {
        quantity,
        lens_params: lensParams === undefined ? cartLineLensParams(row) : lensParams,
      };
      if (comboId) {
        await updateCartComboItem(comboId, payload);
      } else {
        await updateCartItem(itemId, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    } catch (e) {
      const msg = getApiErrorMessage(e, "Không cập nhật được giỏ hàng.");
      setLineMessage(key, msg);
      toast.error(msg);
    } finally {
      setLineBusy(key, false);
    }
  };

  const removeLine = async (row: Record<string, unknown>) => {
    const itemId = cartLineId(row);
    const comboId = cartLineComboId(row);
    const key = itemId || comboId;
    if (!key) {
      return;
    }
    setLineBusy(key, true);
    setLineMessage(key, null);
    try {
      if (comboId) {
        await deleteCartComboItem(comboId);
      } else if (itemId) {
        await deleteCartItem(itemId);
      }
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Đã xóa dòng hàng.");
    } catch (e) {
      const msg = getApiErrorMessage(e, "Không thể xóa dòng hàng.");
      setLineMessage(key, msg);
      toast.error(msg);
    } finally {
      setLineBusy(key, false);
    }
  };

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
                  const itemId = cartLineId(row);
                  const comboId = cartLineComboId(row);
                  const key = String(itemId || comboId || row._id || row.id || i);
                  const name = getCartItemDisplayName(row);
                  const varLabel = cartLineVariantLabel(row);
                  const img = getCartItemImage(row);
                  const unit = getCartItemUnitPrice(row);
                  const qty = cartLineQuantity(row);
                  const subtotal = unit * qty;
                  const busy = Boolean(lineLoading[key]);
                  const lensOpen = editingLensKey === key;
                  const currentLensParams = cartLineLensParams(row);
                  const hasLensParams = Object.keys(currentLensParams).length > 0;
                  const missingPriceData = isCartItemMissingPriceData(row);
                  return (
                    <li key={key} className="py-4">
                      <div className="grid gap-3 md:grid-cols-[44px_1fr_120px_140px_140px] md:items-center">
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
                          {isComboItem(row) && missingPriceData ? (
                            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Thiếu dữ liệu giá
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 md:text-center">{formatPriceVnd(unit)}</p>
                      <div className="inline-flex h-9 w-fit items-center border border-[#2bb6a3]/50 md:mx-auto">
                        <button
                          type="button"
                          className="w-8 text-center text-slate-500 disabled:opacity-50"
                          disabled={busy || qty <= 1}
                          onClick={() => {
                            void patchLine(row, qty - 1);
                          }}
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-slate-900">{qty}</span>
                        <button
                          type="button"
                          className="w-8 text-center text-[#2bb6a3] disabled:opacity-50"
                          disabled={busy}
                          onClick={() => {
                            void patchLine(row, qty + 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-lg font-bold text-slate-900 md:text-right">{formatPriceVnd(subtotal)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => setEditingLensKey((prev) => (prev === key ? null : key))}
                        >
                          {lensOpen ? "Ẩn lens params" : hasLensParams ? "Sửa lens params" : "Nhập lens params"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          disabled={busy}
                          onClick={() => {
                            void removeLine(row);
                          }}
                        >
                          {busy ? "Đang xử lý..." : "Xóa"}
                        </button>
                        {comboId ? <span className="text-xs text-slate-500">Combo item</span> : null}
                      </div>
                      {lineError[key] ? <p className="mt-2 text-xs text-red-600">{lineError[key]}</p> : null}
                      {lensOpen ? (
                        <div className="mt-2">
                          <LensParamsEditor
                            initialValue={currentLensParams}
                            submitting={busy}
                            onSubmit={(lensParams) => {
                              void patchLine(row, qty, lensParams);
                            }}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setClearing(true);
                    void clearCart()
                      .then(async () => {
                        toast.success("Đã xóa toàn bộ giỏ hàng.");
                        await queryClient.invalidateQueries({ queryKey: ["cart"] });
                      })
                      .catch((e) => toast.error(getApiErrorMessage(e, "Không thể xóa toàn bộ giỏ hàng.")))
                      .finally(() => setClearing(false));
                  }}
                  disabled={clearing}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-slate-100 px-5 text-sm font-semibold text-slate-500 disabled:opacity-60"
                >
                  {clearing ? "Đang xóa..." : "Xóa tất cả"}
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

      </main>
      <SiteFooter />
    </div>
  );
}
