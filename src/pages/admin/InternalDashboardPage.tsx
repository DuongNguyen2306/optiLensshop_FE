import { Link } from "react-router-dom";
import { canManageCatalog } from "@/lib/catalog-roles";
import { canAccessManagersManagement, canAccessStaffManagement } from "@/lib/management-roles";
import { normalizeRole } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";

export default function InternalDashboardPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const r = normalizeRole(role);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Internal Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">Khu vực nghiệp vụ nội bộ theo quyền của {String(role ?? "unknown")}.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/orders" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#2bb6a3]">
          <p className="text-sm font-semibold text-slate-900">Đơn nội bộ</p>
          <p className="mt-1 text-xs text-slate-500">Xử lý xác nhận/từ chối/cập nhật trạng thái đơn.</p>
        </Link>

        {(r === "manager" || r === "admin") && (
          <Link
            to="/admin/catalog/statistics"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#2bb6a3]"
          >
            <p className="text-sm font-semibold text-slate-900">Thống kê</p>
            <p className="mt-1 text-xs text-slate-500">KPI doanh thu, funnel, tồn kho, top sản phẩm.</p>
          </Link>
        )}

        {canManageCatalog(role) && (
          <Link to="/admin/catalog/products" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#2bb6a3]">
            <p className="text-sm font-semibold text-slate-900">Catalog</p>
            <p className="mt-1 text-xs text-slate-500">Quản lý sản phẩm, variants, categories, brands, models, combos.</p>
          </Link>
        )}

        {canAccessStaffManagement(role) && (
          <Link to="/admin/management/staff" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#2bb6a3]">
            <p className="text-sm font-semibold text-slate-900">Staff Management</p>
            <p className="mt-1 text-xs text-slate-500">Quản lý tài khoản staff nội bộ.</p>
          </Link>
        )}

        {canAccessManagersManagement(role) && (
          <Link
            to="/admin/management/managers"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#2bb6a3]"
          >
            <p className="text-sm font-semibold text-slate-900">Managers Management</p>
            <p className="mt-1 text-xs text-slate-500">Chỉ admin: tạo/cập nhật/xóa managers.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
