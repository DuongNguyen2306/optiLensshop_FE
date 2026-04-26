import { Navigate } from "react-router-dom";
import { roleDefaultPath } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";

export default function RoleHomeRedirect() {
  const { token, user } = useAppSelector((s) => s.auth);
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={roleDefaultPath(user?.role)} replace />;
}
