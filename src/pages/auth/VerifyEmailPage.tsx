import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { verifyEmail } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";

type Phase = "loading" | "success" | "error" | "missing_token";

const REDIRECT_MS = 2200;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = searchParams.get("token");

  const [phase, setPhase] = useState<Phase>(() => (token ? "loading" : "missing_token"));
  const [message, setMessage] = useState(() =>
    token ? "" : "Thiếu token trong đường dẫn. Hãy dùng đúng link trong email."
  );
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRedirectTimer = () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  const goLogin = () => {
    clearRedirectTimer();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    clearRedirectTimer();

    if (!token) {
      setPhase("missing_token");
      setMessage("Thiếu token trong đường dẫn. Hãy dùng đúng link trong email.");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setPhase("loading");
      setMessage("");
      try {
        const msg = await dispatch(verifyEmail(token)).unwrap();
        if (cancelled) {
          return;
        }
        setPhase("success");
        setMessage(msg);
        toast.success(msg);
        redirectTimerRef.current = window.setTimeout(() => {
          navigate("/login", { replace: true });
        }, REDIRECT_MS);
      } catch (e) {
        if (cancelled) {
          return;
        }
        const err = typeof e === "string" ? e : "Không thể xác thực email.";
        setPhase("error");
        setMessage(err);
        toast.error(err);
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearRedirectTimer();
    };
  }, [dispatch, navigate, token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Xác thực email</h1>

        {phase === "loading" ? (
          <div className="mt-6 space-y-3">
            <div className="h-2 w-full animate-pulse rounded bg-slate-200" />
            <p className="text-sm text-slate-600">Đang xác thực, vui lòng đợi…</p>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-emerald-700">{message}</p>
            <p className="text-xs text-slate-500">
              Bạn sẽ được chuyển tới trang đăng nhập sau vài giây…
            </p>
            <Button type="button" className="w-full" onClick={goLogin}>
              Đăng nhập ngay
            </Button>
          </div>
        ) : null}

        {phase === "error" || phase === "missing_token" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-red-600">{message}</p>
            <p className="text-xs text-slate-500">
              Link có thể đã hết hạn hoặc đã được sử dụng. Nếu đã xác thực rồi, hãy thử đăng nhập.
            </p>
            <Link
              to="/auth/resend"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2bb6a3] text-sm font-semibold text-white hover:brightness-[0.98]"
            >
              Gửi lại email xác thực
            </Link>
            <Button type="button" variant="outline" className="w-full" onClick={goLogin}>
              Đến đăng nhập
            </Button>
            <p className="text-center text-xs text-slate-400">
              <Link to="/login" className="text-[#2bb6a3] hover:underline">
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
