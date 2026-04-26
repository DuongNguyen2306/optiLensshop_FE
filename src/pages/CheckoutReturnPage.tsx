import { Link, Navigate, useSearchParams } from "react-router-dom";
import { getMomoReturnPageCopy } from "@/lib/momo-return-copy";
import { readPaymentReturnParams } from "@/lib/payment-return";
import { cn } from "@/lib/utils";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";

export default function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const { orderId, message } = readPaymentReturnParams(params);
  const { heading, paragraphs, variant, referenceLine } = getMomoReturnPageCopy(params);

  if (orderId) {
    if (variant === "success") {
      return <Navigate to={`/checkout/success?orderId=${encodeURIComponent(orderId)}`} replace />;
    }
    const suffix = message ? `&msg=${encodeURIComponent(message)}` : "";
    return <Navigate to={`/checkout/fail?orderId=${encodeURIComponent(orderId)}${suffix}`} replace />;
  }

  const accent =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50/60"
      : variant === "pending"
        ? "border-amber-200 bg-amber-50/50"
        : "border-slate-200 bg-slate-50/80";

  return (
    <div className="min-h-screen bg-transparent">
      <StoreHeader />
      <main className="mx-auto flex max-w-lg flex-col justify-center px-6 py-12 sm:min-h-[55vh] sm:py-16">
        <div className={cn("rounded-2xl border p-8 text-center shadow-sm", accent)}>
          {variant === "success" ? (
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-emerald-600 shadow-sm"
              aria-hidden
            >
              ✓
            </div>
          ) : null}
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{heading}</h1>
          <div className="mt-5 space-y-3 text-left text-sm leading-relaxed text-slate-700">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {referenceLine ? (
            <p className="mt-5 border-t border-slate-200/80 pt-4 text-xs text-slate-500">{referenceLine}</p>
          ) : null}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-[#2bb6a3] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-[0.98]"
          >
            Về trang chủ
          </Link>
          <Link
            to="/cart"
            className="inline-flex min-w-[140px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Xem giỏ hàng
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
