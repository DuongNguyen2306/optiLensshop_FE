import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "@/components/auth/login-form";

const LOGIN_HERO =
  "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80";

export default function LoginPage() {
  return (
    <AuthShell
      title="Đăng nhập"
      description="Đăng nhập bằng email và mật khẩu. Vui lòng xác thực email qua link trong hộp thư trước khi đăng nhập."
      imageSrc={LOGIN_HERO}
      imageAlt="Model đeo kính MYLENS"
    >
      <LoginForm />
    </AuthShell>
  );
}
