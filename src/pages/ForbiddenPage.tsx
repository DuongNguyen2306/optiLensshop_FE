import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-6xl font-black text-slate-200">403</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Tài khoản của bạn không được phép xem trang này. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản trị viên.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-[#2bb6a3] px-6 text-sm font-semibold text-white shadow-sm transition hover:brightness-[0.98]"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
