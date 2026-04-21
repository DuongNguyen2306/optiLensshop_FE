import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { canAccessStaffManagement } from "@/lib/management-roles";
import { useAppSelector } from "@/store/hooks";

interface ProtectedStaffManagementRouteProps {
  children: ReactNode;
}

/** Chỉ manager / admin. Khách → /login; role khác → /403. */
export default function ProtectedStaffManagementRoute({ children }: ProtectedStaffManagementRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && !canAccessStaffManagement(user.role)) {
      toast.error("Bạn không có quyền truy cập quản lý nhân sự (403).");
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessStaffManagement(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
