import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canManageCatalog } from "@/lib/catalog-roles";
import { canAccessManagersManagement, canAccessStaffManagement } from "@/lib/management-roles";
import { normalizeRole } from "@/lib/role-routing";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";

interface LinkItem {
  to: string;
  label: string;
}

function sectionLinks(role: string | undefined): { title: string; links: LinkItem[] }[] {
  const r = normalizeRole(role);
  const sections: { title: string; links: LinkItem[] }[] = [];

  if (r === "sales" || r === "operations" || r === "manager" || r === "admin") {
    const orderLinks: LinkItem[] = [{ to: "/admin/orders", label: "Đơn nội bộ" }];
    if (r === "operations" || r === "manager" || r === "admin") {
      orderLinks.push({ to: "/admin/returns", label: "Quản lý trả hàng" });
    }
    sections.push({
      title: "Đơn hàng",
      links: orderLinks,
    });
  }
  // Tạm ẩn module Inbound Allocation theo yêu cầu.
  // if (r === "operations" || r === "manager" || r === "admin") {
  //   sections.push({
  //     title: "Inbound",
  //     links: [
  //       { to: "/ops/inbound", label: "Danh sách phiếu nhập" },
  //       { to: "/ops/inbound/create-from-orders", label: "Tạo từ đơn nợ" },
  //     ],
  //   });
  // }

  if (r === "manager" || r === "admin") {
    sections.push({
      title: "Thống kê",
      links: [
        { to: "/admin/dashboard", label: "Dashboard nội bộ" },
        { to: "/admin/catalog/statistics", label: "Báo cáo KPI" },
        ...(r === "admin" ? [{ to: "/admin/analytics/finance", label: "Financial Analytics" }] : []),
      ],
    });
    sections.push({
      title: "Kho",
      links: [
        // Tạm ẩn chức năng phiếu nhập kho cũ theo yêu cầu.
        // { to: "/admin/inventory/receipts", label: "Phiếu nhập kho" },
        { to: "/admin/inventory/ledger", label: "Sổ kho (Ledger)" },
      ],
    });
  }

  if (canManageCatalog(role)) {
    sections.push({
      title: "Catalog",
      links: [
        { to: "/admin/catalog/products", label: "Sản phẩm" },
        { to: "/admin/catalog/combos", label: "Combos" },
        { to: "/admin/catalog/categories", label: "Danh mục" },
        { to: "/admin/catalog/brands", label: "Thương hiệu" },
        { to: "/admin/catalog/models", label: "Model" },
      ],
    });
  }

  if (canAccessStaffManagement(role)) {
    const links: LinkItem[] = [{ to: "/admin/management/staff", label: "Staff" }];
    if (canAccessManagersManagement(role)) {
      links.push({ to: "/admin/management/managers", label: "Managers" });
    }
    sections.push({
      title: "Nhân sự",
      links,
    });
  }

  return sections;
}

export default function InternalLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const role = useAppSelector((s) => s.auth.user?.role);
  const sections = sectionLinks(role);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Đã đăng xuất.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Internal</p>
          <p className="text-sm font-bold">Role: {String(role ?? "unknown")}</p>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
              <div className="space-y-0.5">
                {section.links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-lg px-3 py-2 text-sm font-medium transition",
                        isActive ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <p className="truncate text-xs text-slate-400">{user?.email ?? "internal-user"}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
            onClick={() => {
              void handleLogout();
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
