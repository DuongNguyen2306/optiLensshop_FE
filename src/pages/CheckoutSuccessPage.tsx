import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { confirmPaymentSuccess } from "@/services/payment.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { readPaymentReturnParams } from "@/lib/payment-return";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const { orderId } = useMemo(() => readPaymentReturnParams(searchParams), [searchParams]);

  const confirmQuery = useQuery({
    queryKey: ["payment", "success", orderId],
    enabled: Boolean(orderId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => confirmPaymentSuccess(orderId),
  });

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-emerald-600 shadow-sm">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thanh toán thành công</h1>
          {!orderId ? (
            <p className="mt-4 text-sm text-red-600">Không tìm thấy mã đơn hàng trong đường dẫn.</p>
          ) : confirmQuery.isPending ? (
            <p className="mt-4 text-sm text-slate-700">Đang xác nhận thanh toán với hệ thống...</p>
          ) : confirmQuery.isError ? (
            <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(confirmQuery.error, "Không thể xác nhận thanh toán.")}</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-700">
                Đơn hàng của bạn đã được ghi nhận và thanh toán thành công.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Mã đơn: <span className="font-semibold text-slate-900">{confirmQuery.data?.orderId ?? orderId}</span>
              </p>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/orders"
            className="inline-flex min-w-[150px] items-center justify-center rounded-full bg-[#2bb6a3] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-[0.98]"
          >
            Xem đơn hàng
          </Link>
          <Link
            to="/"
            className="inline-flex min-w-[150px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
