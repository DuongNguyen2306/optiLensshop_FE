import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { forgotPassword } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { emailSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: emailSchema,
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const msg = await dispatch(forgotPassword({ email: values.email.trim() })).unwrap();
      toast.success(msg);
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Không thể gửi yêu cầu.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập email đã đăng ký. Hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu nếu email hợp lệ.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-email">Email</Label>
            <Input id="fp-email" type="email" placeholder="you@example.com" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="h-11 w-full">
            Gửi yêu cầu
          </Button>
        </form>
        <Link to="/login" className="mt-4 block text-center text-sm text-[#2bb6a3] hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
