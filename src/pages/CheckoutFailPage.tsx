import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { confirmPaymentFail } from "@/services/payment.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { readPaymentReturnParams } from "@/lib/payment-return";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";

export default function CheckoutFailPage() {
  const [searchParams] = useSearchParams();
  const { orderId, message } = useMemo(() => readPaymentReturnParams(searchParams), [searchParams]);

  const confirmQuery = useQuery({
    queryKey: ["payment", "fail", orderId, message],
    enabled: Boolean(orderId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => confirmPaymentFail(orderId, message),
  });

  return (
    <div className="min-h-screen bg-transparent">
      <StoreHeader />
      <main className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-rose-600 shadow-sm">
            !
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thanh toán chưa thành công</h1>
          {!orderId ? (
            <p className="mt-4 text-sm text-red-600">Không tìm thấy mã đơn hàng trong đường dẫn.</p>
          ) : confirmQuery.isPending ? (
            <p className="mt-4 text-sm text-slate-700">Đang cập nhật trạng thái thanh toán...</p>
          ) : confirmQuery.isError ? (
            <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(confirmQuery.error, "Không thể cập nhật trạng thái thất bại.")}</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-700">
                Giao dịch chưa hoàn tất. Bạn có thể thử lại thanh toán hoặc quay lại giỏ hàng.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Lý do: <span className="font-semibold text-slate-900">{message || confirmQuery.data?.message || "Không xác định"}</span>
              </p>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={orderId ? `/checkout?orderId=${encodeURIComponent(orderId)}` : "/checkout"}
            className="inline-flex min-w-[170px] items-center justify-center rounded-full bg-[#2bb6a3] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-[0.98]"
          >
            Thử lại thanh toán
          </Link>
          <Link
            to="/cart"
            className="inline-flex min-w-[170px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Về giỏ hàng
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
