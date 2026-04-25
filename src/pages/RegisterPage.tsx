import AuthShell from "@/components/auth/auth-shell";
import RegisterForm from "@/components/auth/register-form";

const REGISTER_HERO =
  "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=80";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Đăng ký email"
      description="Hãy đăng ký để được hưởng nhiều đặc quyền riêng dành cho bạn"
      imageSrc={REGISTER_HERO}
      imageAlt="Model đeo kính — MYLENS"
      titleAlign="center"
    >
      <RegisterForm />
    </AuthShell>
  );
}
