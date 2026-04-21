import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import ChangePasswordForm from "@/components/auth/change-password-form";
import { Button } from "@/components/ui/button";
import { logout } from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Đã đăng xuất.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <StoreHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Hồ sơ</h1>
        <p className="mt-2 text-slate-600">
          Xin chào,{" "}
          <span className="font-semibold text-[#2bb6a3]">{user?.email ?? "bạn"}</span>
        </p>
        {user ? (
          <dl className="mt-6 grid gap-2 text-sm text-slate-700">
            <div className="flex gap-2">
              <dt className="font-medium text-slate-500">Vai trò</dt>
              <dd>{user.role}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-slate-500">Trạng thái</dt>
              <dd>{user.status}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-slate-500">Email đã xác thực</dt>
              <dd>{user.is_email_verified ? "Có" : "Chưa"}</dd>
            </div>
          </dl>
        ) : null}

        {user?.role === "customer" ? (
          <div className="mt-6">
            <Link
              to="/orders"
              className="inline-flex rounded-lg border border-[#2bb6a3] bg-white px-4 py-2 text-sm font-semibold text-[#2bb6a3] transition hover:bg-[#2bb6a3]/10"
            >
              Đơn hàng của tôi
            </Link>
          </div>
        ) : null}

        <ChangePasswordForm />

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 text-slate-700 sm:w-auto"
            onClick={() => void handleLogout()}
          >
            Đăng xuất
          </Button>
          <Link to="/" className="text-center text-sm font-medium text-[#2bb6a3] hover:underline sm:text-right">
            ← Về trang chủ
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
