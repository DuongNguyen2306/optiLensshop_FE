import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { canAccessManagersManagement } from "@/lib/management-roles";
import { useAppSelector } from "@/store/hooks";

interface ProtectedManagersManagementRouteProps {
  children: ReactNode;
}

/** Chỉ admin. Manager hoặc role khác → /403. */
export default function ProtectedManagersManagementRoute({ children }: ProtectedManagersManagementRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && !canAccessManagersManagement(user.role)) {
      toast.error("Chỉ admin được quản lý danh sách manager (403).");
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessManagersManagement(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
