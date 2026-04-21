import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SEC = 60;

type LocationState = { email?: string };

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain || !local) {
    return email;
  }
  const visible = local.slice(0, 2);
  return `${visible}${local.length > 2 ? "•••" : ""}@${domain}`;
}

export default function VerifyPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const stateEmail = (location.state as LocationState | null)?.email?.trim() ?? "";
  const rawQuery = searchParams.get("email")?.trim() ?? "";
  let queryEmail = "";
  if (rawQuery) {
    try {
      queryEmail = decodeURIComponent(rawQuery.replace(/\+/g, " "));
    } catch {
      queryEmail = rawQuery;
    }
  }
  const email = stateEmail || queryEmail;

  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const t = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0 || resendLoading) {
      return;
    }
    setResendLoading(true);
    try {
      const msg = await dispatch(resendVerificationEmail({ email })).unwrap();
      toast.success(msg);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Không gửi được email. Vui lòng thử lại.");
    } finally {
      setResendLoading(false);
    }
  }, [dispatch, email, cooldown, resendLoading]);

  if (!email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Thiếu thông tin email</h1>
          <p className="mt-2 text-sm text-slate-600">
            Vui lòng đăng ký lại hoặc mở đúng luồng từ trang đăng ký.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate("/register", { replace: true })}>
            Đến đăng ký
          </Button>
          <Link to="/login" className="mt-4 inline-block text-sm text-[#2bb6a3] hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#2bb6a3]">OptiLens Shop</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Kiểm tra hộp thư</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Chúng tôi đã gửi liên kết xác thực tới{" "}
          <span className="font-semibold text-slate-900" title={email}>
            {maskEmail(email)}
          </span>
          . Mở email và nhấn <strong>Xác thực ngay</strong> (hoặc dùng liên kết trong thư).
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Sau khi xác thực, bạn có thể đăng nhập. Nếu không thấy thư, kiểm tra mục Spam / Quảng cáo.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            disabled={resendLoading || cooldown > 0}
            onClick={handleResend}
          >
            {resendLoading
              ? "Đang gửi…"
              : cooldown > 0
                ? `Gửi lại sau (${cooldown}s)`
                : "Gửi lại email"}
          </Button>
          <Link
            to="/login"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Quay lại đăng nhập
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Sai email?{" "}
          <Link to="/register" className="font-medium text-[#2bb6a3] hover:underline">
            Đăng ký lại
          </Link>
        </p>
      </div>
    </div>
  );
}
