import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { roleDefaultPath } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";

interface RequireRoleProps {
  allowedRoles: string[];
  redirectTo?: string;
  message?: string;
  children?: ReactNode;
}

export default function RequireRole({
  allowedRoles,
  redirectTo,
  message = "Bạn không có quyền truy cập.",
  children,
}: RequireRoleProps) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const normalizedRole = String(role ?? "").toLowerCase();
  const allowed = allowedRoles.map((r) => r.toLowerCase());
  const canAccess = allowed.includes(normalizedRole);
  const fallback = redirectTo ?? roleDefaultPath(role);

  useEffect(() => {
    if (!canAccess) {
      toast.error(message);
    }
  }, [canAccess, message]);

  if (!canAccess) {
    return <Navigate to={fallback} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
