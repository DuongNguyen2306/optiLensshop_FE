import { NavLink } from "react-router-dom";
import { canAccessManagersManagement, canAccessStaffManagement } from "@/lib/management-roles";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

const catalogLinks = [
  { to: "/admin/catalog/products", label: "Sản phẩm" },
  { to: "/admin/catalog/categories", label: "Danh mục" },
  { to: "/admin/catalog/brands", label: "Thương hiệu" },
  { to: "/admin/catalog/models", label: "Model mẫu mã" },
];

export default function AdminSidebar() {
  const user = useAppSelector((s) => s.auth.user);
  const showHr = canAccessStaffManagement(user?.role);
  const showManagersLink = canAccessManagersManagement(user?.role);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Catalog</p>
        <p className="text-sm font-bold">Quản trị</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {catalogLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            {l.label}
          </NavLink>
        ))}

        {showHr ? (
          <>
            <p className="mt-3 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nhân sự</p>
            <NavLink
              to="/admin/management/staff"
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              Staff
            </NavLink>
            {showManagersLink ? (
              <NavLink
                to="/admin/management/managers"
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                Managers
              </NavLink>
            ) : null}
          </>
        ) : null}
      </nav>
      <div className="mt-auto border-t border-slate-700 p-3">
        <NavLink
          to="/"
          className="block rounded-lg px-3 py-2 text-center text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          ← Về cửa hàng
        </NavLink>
      </div>
    </aside>
  );
}
