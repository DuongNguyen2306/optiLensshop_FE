import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { login } from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { emailSchema, passwordSchema } from "@/lib/auth-validation";
import { isInternalRole, isCustomerRole, roleDefaultPath } from "@/lib/role-routing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function looksLikeEmailNotVerifiedMessage(msg: string) {
  return /xác thực.*email|email.*xác thực|chưa.*xác thực|verify.*email|unverified|chưa kích hoạt/i.test(
    msg
  );
}

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;
  const { loading, error } = useAppSelector((state) => state.auth);
  const [showVerifyCta, setShowVerifyCta] = useState(false);
  const [lastTriedEmail, setLastTriedEmail] = useState("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    setShowVerifyCta(false);
    setLastTriedEmail("");
    const emailTrim = values.email.trim();
    try {
      const auth = await dispatch(
        login({
          email: emailTrim,
          password: values.password,
        })
      ).unwrap();
      toast.success("Đăng nhập thành công!");
      const role = auth.user.role;
      const targetByRole = roleDefaultPath(role);

      if (typeof fromPath !== "string" || !fromPath.trim()) {
        navigate(targetByRole, { replace: true });
        return;
      }

      const wantsInternal = fromPath.startsWith("/admin");
      const wantsCustomer =
        fromPath === "/" ||
        fromPath.startsWith("/products/") ||
        fromPath.startsWith("/combos") ||
        fromPath === "/cart" ||
        fromPath.startsWith("/checkout") ||
        fromPath === "/order-success" ||
        fromPath === "/orders" ||
        fromPath.startsWith("/orders/") ||
        fromPath === "/profile";

      if (wantsInternal && isInternalRole(role)) {
        navigate(fromPath, { replace: true });
        return;
      }

      if (wantsCustomer && isCustomerRole(role)) {
        navigate(fromPath, { replace: true });
        return;
      }

      navigate(targetByRole, { replace: true });
    } catch (submitError) {
      const errorMessage =
        typeof submitError === "string"
          ? submitError
          : "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
      setLastTriedEmail(emailTrim);
      setShowVerifyCta(looksLikeEmailNotVerifiedMessage(errorMessage));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email<span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Nhập email"
          autoComplete="email"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          Mật khẩu<span className="text-red-500">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="remember" {...form.register("remember")} />
        <label htmlFor="remember" className="text-sm text-slate-600">
          Lưu tài khoản
        </label>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {showVerifyCta && lastTriedEmail ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Tài khoản có thể chưa xác thực email.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-[#2bb6a3] text-[#2bb6a3]"
              onClick={() =>
                navigate("/auth/verify-pending", {
                  state: { email: lastTriedEmail },
                })
              }
            >
              Đến màn chờ xác thực
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#2bb6a3] hover:brightness-[0.98]"
              onClick={() =>
                navigate("/auth/resend", {
                  state: { email: lastTriedEmail },
                })
              }
            >
              Gửi lại email xác thực
            </Button>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="h-12 w-full rounded-md text-base">
        {loading ? "Đang xử lý..." : "Đăng nhập"}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm">
        <Link to="/forgot-password" className="text-slate-500 underline-offset-2 hover:text-[#2bb6a3] hover:underline">
          Quên mật khẩu?
        </Link>
        <Link to="/auth/resend" className="text-slate-500 underline-offset-2 hover:text-[#2bb6a3] hover:underline">
          Gửi lại email xác thực
        </Link>
      </div>

      <p className="text-center text-sm text-slate-600">
        Bạn chưa có tài khoản MYLENS?{" "}
        <Link to="/register" className="font-semibold text-[#2bb6a3] hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}
