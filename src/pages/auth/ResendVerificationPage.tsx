import { useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { emailSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: emailSchema,
});

type FormData = z.infer<typeof schema>;

type LocationState = { email?: string };

export default function ResendVerificationPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const initialEmail = stateEmail || queryEmail;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail },
  });

  const { reset } = form;
  useEffect(() => {
    if (initialEmail) {
      reset({ email: initialEmail });
    }
  }, [initialEmail, reset]);

  const onSubmit = async (values: FormData) => {
    try {
      const msg = await dispatch(resendVerificationEmail({ email: values.email.trim() })).unwrap();
      toast.success(msg);
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Gửi email thất bại.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Gửi lại email xác thực</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập email đã đăng ký. Thông báo hiển thị theo phản hồi từ server.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rv-email">Email</Label>
            <Input id="rv-email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang gửi…" : "Gửi lại email"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-[#2bb6a3] hover:underline"
          onClick={() => navigate(-1)}
        >
          ← Quay lại
        </button>
        <Link to="/login" className="mt-2 block text-center text-sm text-slate-500 hover:text-[#2bb6a3]">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
