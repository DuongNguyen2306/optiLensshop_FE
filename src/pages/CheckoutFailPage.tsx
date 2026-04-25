import { useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { confirmPaymentFail } from "@/services/payment.service";
import { fetchMyOrderDetail } from "@/services/order.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { isSuccessfulGatewayReturn, readPaymentReturnParams } from "@/lib/payment-return";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";

function isPaidOrderDetail(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  const orderRaw = root.order && typeof root.order === "object" ? root.order : root;
  if (!orderRaw || typeof orderRaw !== "object") return false;
  const order = orderRaw as Record<string, unknown>;
  const pay = order.payment && typeof order.payment === "object" ? (order.payment as Record<string, unknown>) : null;

  const status = String(pay?.status ?? order.payment_status ?? "").toLowerCase();
  const paidAt = typeof pay?.paid_at === "string" && pay.paid_at.trim() ? pay.paid_at : null;
  const txn = typeof pay?.transaction_id === "string" && pay.transaction_id.trim() ? pay.transaction_id : null;
  const rem = typeof order.remaining_amount === "number" ? order.remaining_amount : Number(order.remaining_amount);
  const dep = typeof order.deposit_amount === "number" ? order.deposit_amount : Number(order.deposit_amount);
  const total = typeof order.final_amount === "number" ? order.final_amount : Number(order.final_amount ?? order.total_amount);

  if (paidAt || txn) return true;
  if (["paid", "completed", "success", "successful", "succeeded", "deposit-paid"].includes(status)) return true;
  if (Number.isFinite(rem) && rem === 0 && Number.isFinite(dep) && dep > 0) return true;
  if (Number.isFinite(dep) && Number.isFinite(total) && dep >= total - 0.5) return true;
  return false;
}

export default function CheckoutFailPage() {
  const [searchParams] = useSearchParams();
  const { orderId, message } = useMemo(() => readPaymentReturnParams(searchParams), [searchParams]);
  const shouldRedirectSuccess = useMemo(
    () => Boolean(orderId) && isSuccessfulGatewayReturn(searchParams),
    [orderId, searchParams]
  );

  if (shouldRedirectSuccess) {
    return <Navigate to={`/checkout/success?orderId=${encodeURIComponent(orderId)}`} replace />;
  }

  const confirmQuery = useQuery({
    queryKey: ["payment", "fail", orderId, message],
    enabled: Boolean(orderId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => confirmPaymentFail(orderId, message),
  });
  const orderDetailQuery = useQuery({
    queryKey: ["orders", "detail", "from-fail", orderId],
    enabled: Boolean(orderId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => fetchMyOrderDetail(orderId),
  });

  if (orderId && orderDetailQuery.data && isPaidOrderDetail(orderDetailQuery.data)) {
    return <Navigate to={`/checkout/success?orderId=${encodeURIComponent(orderId)}`} replace />;
  }

  // Tránh flash UI "thất bại" trong lúc còn đang xác minh trạng thái đơn thực tế.
  const isVerifyingFinalStatus = Boolean(orderId) && (confirmQuery.isPending || orderDetailQuery.isPending);

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
          ) : isVerifyingFinalStatus ? (
            <p className="mt-4 text-sm text-slate-700">Đang xác minh trạng thái thanh toán...</p>
          ) : confirmQuery.isError ? (
            <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(confirmQuery.error, "Không thể cập nhật trạng thái thất bại.")}</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-700">
                Giao dịch chưa hoàn tất. Bạn có thể thử lại thanh toán hoặc quay lại giỏ hàng.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Lý do:{" "}
                <span className="font-semibold text-slate-900">
                  {confirmQuery.data?.message || message || "Không xác định"}
                </span>
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
