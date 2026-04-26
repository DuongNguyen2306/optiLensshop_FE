import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { resetPassword } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { passwordSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: passwordSchema,
    confirm_password: passwordSchema,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Mật khẩu xác nhận phải trùng.",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = searchParams.get("token") ?? "";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm_password: "" },
  });

  const onSubmit = async (values: FormData) => {
    if (!token) {
      toast.error("Thiếu token. Dùng link đầy đủ từ email.");
      return;
    }
    try {
      const msg = await dispatch(
        resetPassword({
          token,
          password: values.password,
          confirm_password: values.confirm_password,
        })
      ).unwrap();
      toast.success(msg);
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Đặt lại mật khẩu thất bại.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600">Mật khẩu mới 5–64 ký tự.</p>
        {!token ? (
          <p className="mt-4 text-sm text-red-500">Thiếu token trong URL (?token=...).</p>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-pw">Mật khẩu mới</Label>
            <Input id="rp-pw" type="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-cf">Xác nhận mật khẩu</Label>
            <Input id="rp-cf" type="password" autoComplete="new-password" {...form.register("confirm_password")} />
            {form.formState.errors.confirm_password ? (
              <p className="text-xs text-red-500">{form.formState.errors.confirm_password.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="h-11 w-full" disabled={!token}>
            Cập nhật mật khẩu
          </Button>
        </form>
        <Link to="/login" className="mt-4 block text-center text-sm text-[#2bb6a3] hover:underline">
          ← Đăng nhập
        </Link>
      </div>
    </div>
  );
}
