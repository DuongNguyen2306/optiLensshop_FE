import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { canManageCatalog } from "@/lib/catalog-roles";
import { useAppSelector } from "@/store/hooks";

interface ProtectedCatalogAdminRouteProps {
  children: ReactNode;
}

/**
 * Chỉ manager / admin được vào khu vực quản trị catalog.
 * Khách chưa đăng nhập → /login; đã login nhưng không đủ quyền → / (403).
 */
export default function ProtectedCatalogAdminRoute({ children }: ProtectedCatalogAdminRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && !canManageCatalog(user.role)) {
      toast.error("Bạn không có quyền truy cập khu vực quản trị catalog (403).");
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canManageCatalog(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
