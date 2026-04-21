import { Link, Navigate, useLocation } from "react-router-dom";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { cn } from "@/lib/utils";

export type OrderSuccessLocationState = {
  order?: unknown;
  message?: string;
};

function orderIdFromOrder(order: unknown): string | null {
  if (!order || typeof order !== "object") {
    return null;
  }
  const o = order as Record<string, unknown>;
  const id = o._id ?? o.id ?? o.order_id ?? o.orderId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const state = location.state as OrderSuccessLocationState | null;

  if (state == null) {
    return <Navigate to="/" replace />;
  }

  const { order, message } = state;
  const orderId = orderIdFromOrder(order);

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader />
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2bb6a3]">Đặt hàng thành công</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Cảm ơn bạn đã mua hàng</h1>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
        {orderId ? (
          <p className="mt-2 text-sm text-slate-500">
            Mã đơn: <span className="font-medium text-slate-800">{orderId}</span>
          </p>
        ) : null}
        <p className="mt-4 text-sm text-slate-600">
          Bạn đã chọn thanh toán khi nhận hàng. Vui lòng chuẩn bị tiền mặt khi nhân viên giao hàng đến.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition",
              "bg-[#2bb6a3] hover:brightness-[0.98]"
            )}
          >
            Về trang chủ
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
