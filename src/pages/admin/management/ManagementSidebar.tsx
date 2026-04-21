import { NavLink } from "react-router-dom";
import { canAccessManagersManagement } from "@/lib/management-roles";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

export default function ManagementSidebar() {
  const user = useAppSelector((s) => s.auth.user);
  const showManagers = canAccessManagersManagement(user?.role);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Nhân sự</p>
        <p className="text-sm font-bold">RBAC</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
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
        {showManagers ? (
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
      </nav>
      <div className="border-t border-slate-700 p-3">
        <NavLink
          to="/admin/catalog/products"
          className="mb-1 block rounded-lg px-3 py-2 text-center text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          ← Catalog
        </NavLink>
        <NavLink to="/" className="block rounded-lg px-3 py-2 text-center text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          ← Cửa hàng
        </NavLink>
      </div>
    </aside>
  );
}
