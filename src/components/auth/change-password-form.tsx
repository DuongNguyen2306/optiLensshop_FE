import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { changePassword } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { passwordSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    new_password: passwordSchema,
    confirm_new_password: passwordSchema,
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: "Mật khẩu mới không được trùng mật khẩu hiện tại.",
    path: ["new_password"],
  })
  .refine((d) => d.new_password === d.confirm_new_password, {
    message: "Xác nhận phải trùng mật khẩu mới.",
    path: ["confirm_new_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordForm() {
  const dispatch = useAppDispatch();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_new_password: "",
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const msg = await dispatch(
        changePassword({
          current_password: values.current_password,
          new_password: values.new_password,
          confirm_new_password: values.confirm_new_password,
        })
      ).unwrap();
      toast.success(msg);
      form.reset();
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Đổi mật khẩu thất bại.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Đổi mật khẩu</h2>
      <p className="text-xs text-slate-500">Mật khẩu mới 5–64 ký tự, không trùng mật khẩu hiện tại.</p>
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">Mật khẩu hiện tại</Label>
        <Input id="cp-current" type="password" autoComplete="current-password" {...form.register("current_password")} />
        {form.formState.errors.current_password ? (
          <p className="text-xs text-red-500">{form.formState.errors.current_password.message}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-new">Mật khẩu mới (5–64 ký tự)</Label>
        <Input id="cp-new" type="password" autoComplete="new-password" {...form.register("new_password")} />
        {form.formState.errors.new_password ? (
          <p className="text-xs text-red-500">{form.formState.errors.new_password.message}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">Xác nhận mật khẩu mới</Label>
        <Input id="cp-confirm" type="password" autoComplete="new-password" {...form.register("confirm_new_password")} />
        {form.formState.errors.confirm_new_password ? (
          <p className="text-xs text-red-500">{form.formState.errors.confirm_new_password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        Cập nhật mật khẩu
      </Button>
    </form>
  );
}
