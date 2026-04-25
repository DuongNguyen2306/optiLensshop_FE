import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { register } from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { emailSchema, passwordSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm_password: passwordSchema,
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu xác nhận phải trùng với mật khẩu.",
    path: ["confirm_password"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    const emailTrim = values.email.trim();
    try {
      const result = await dispatch(
        register({
          email: emailTrim,
          password: values.password,
          confirm_password: values.confirm_password,
        })
      ).unwrap();

      if (result.token && result.user) {
        toast.success(result.message ?? "Đăng ký thành công!");
        navigate("/", { replace: true });
        return;
      }

      toast.success(
        result.message ??
          "Đăng ký thành công. Vui lòng kiểm tra email và bấm link xác thực trước khi đăng nhập."
      );
      navigate("/auth/verify-pending", {
        replace: true,
        state: { email: emailTrim },
      });
    } catch (submitError) {
      const errorMessage =
        typeof submitError === "string"
          ? submitError
          : "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email<span className="text-red-500">*</span>
        </Label>
        <Input id="email" type="email" placeholder="Nhập email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">
          Mật khẩu<span className="text-red-500">*</span>
        </Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="5–64 ký tự"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">
          Xác nhận mật khẩu<span className="text-red-500">*</span>
        </Label>
        <Input
          id="confirm_password"
          type="password"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          {...form.register("confirm_password")}
        />
        {form.formState.errors.confirm_password ? (
          <p className="text-xs text-red-500">{form.formState.errors.confirm_password.message}</p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Thông tin của bạn sẽ được bảo mật theo{" "}
        <a href="#" className="font-medium text-[#2bb6a3] hover:underline">
          chính sách riêng tư
        </a>{" "}
        của chúng tôi.
      </p>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Button type="submit" disabled={loading} className="h-12 w-full rounded-md text-base">
        {loading ? "Đang xử lý..." : "Đăng ký ngay"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Bạn đã có tài khoản MYLENS?{" "}
        <Link to="/login" className="font-semibold text-[#2bb6a3] hover:underline">
          Đăng nhập ngay
        </Link>
      </p>
    </form>
  );
}
