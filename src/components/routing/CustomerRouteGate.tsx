import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { isInternalRole, roleDefaultPath } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";

export default function CustomerRouteGate({ children }: { children?: ReactNode }) {
  const { token, user } = useAppSelector((s) => s.auth);
  const role = user?.role;
  const internal = Boolean(token) && isInternalRole(role);

  useEffect(() => {
    if (internal) {
      toast.info("Tài khoản nội bộ được chuyển về khu vực nghiệp vụ.");
    }
  }, [internal]);

  if (internal) {
    return <Navigate to={roleDefaultPath(role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
