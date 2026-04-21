import { Outlet } from "react-router-dom";
import ManagementSidebar from "@/pages/admin/management/ManagementSidebar";

export default function ManagementLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <ManagementSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
