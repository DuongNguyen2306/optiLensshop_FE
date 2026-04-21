import { Outlet } from "react-router-dom";
import CustomerRouteGate from "@/components/routing/CustomerRouteGate";

export default function CustomerLayout() {
  return (
    <CustomerRouteGate>
      <Outlet />
    </CustomerRouteGate>
  );
}
