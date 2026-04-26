import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import RequireAuth from "@/components/routing/RequireAuth";
import RequireRole from "@/components/routing/RequireRole";
import RoleHomeRedirect from "@/components/routing/RoleHomeRedirect";
import InternalDashboardPage from "@/pages/admin/InternalDashboardPage";
import BrandsPage from "@/pages/admin/catalog/BrandsPage";
import CategoriesPage from "@/pages/admin/catalog/CategoriesPage";
import CombosAdminPage from "@/pages/admin/catalog/CombosPage";
import ModelsPage from "@/pages/admin/catalog/ModelsPage";
import ProductCreatePage from "@/pages/admin/catalog/ProductCreatePage";
import ProductListPage from "@/pages/admin/catalog/ProductListPage";
import ProductVariantsPage from "@/pages/admin/catalog/ProductVariantsPage";
import StatisticsDashboardPage from "@/pages/admin/StatisticsDashboardPage";
import InternalOrdersPage from "@/pages/admin/management/InternalOrdersPage";
import AdminOrderDetailPage from "@/pages/admin/management/AdminOrderDetailPage";
import AdminReturnsPage from "@/pages/admin/management/AdminReturnsPage";
import AdminReturnDetailPage from "@/pages/admin/management/AdminReturnDetailPage";
import ManagersManagementPage from "@/pages/admin/management/ManagersManagementPage";
import StaffManagementPage from "@/pages/admin/management/StaffManagementPage";
import MyReturnsPage from "@/pages/MyReturnsPage";
import InventoryReceiptsPage from "@/pages/admin/inventory/InventoryReceiptsPage";
import InventoryLedgerPage from "@/pages/admin/inventory/InventoryLedgerPage";
import ComboDetailPage from "@/pages/ComboDetailPage";
import CombosPage from "@/pages/CombosPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import CheckoutReturnPage from "@/pages/CheckoutReturnPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";
import CheckoutFailPage from "@/pages/CheckoutFailPage";
import OrderSuccessPage from "@/pages/OrderSuccessPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import OrdersHistoryPage from "@/pages/OrdersHistoryPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ProfilePage from "@/pages/ProfilePage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import VerifyPendingPage from "@/pages/auth/VerifyPendingPage";
import ResendVerificationPage from "@/pages/auth/ResendVerificationPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import CustomerLayout from "@/pages/layouts/CustomerLayout";
import InternalLayout from "@/pages/layouts/InternalLayout";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/combos" element={<CombosPage />} />
          <Route path="/combos/:slug" element={<ComboDetailPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/fail" element={<CheckoutFailPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

        <Route path="/auth/verify-pending" element={<VerifyPendingPage />} />
        <Route path="/auth/resend" element={<ResendVerificationPage />} />
        <Route path="/resend-verification" element={<Navigate to="/auth/resend" replace />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        <Route path="/403" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["customer"]} />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="/orders" element={<OrdersHistoryPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/my-returns" element={<MyReturnsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["sales", "operations", "manager", "admin"]} />}>
            <Route path="/admin" element={<InternalLayout />}>
              <Route index element={<RoleHomeRedirect />} />
              <Route path="dashboard" element={<InternalDashboardPage />} />
              <Route path="orders" element={<InternalOrdersPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="returns" element={<AdminReturnsPage />} />
              <Route path="returns/:id" element={<AdminReturnDetailPage />} />

              <Route element={<RequireRole allowedRoles={["manager", "admin"]} message="Chỉ manager/admin được truy cập." />}>
                <Route path="catalog/products" element={<ProductListPage />} />
                <Route path="catalog/products/new" element={<ProductCreatePage />} />
                <Route path="catalog/products/:productId/variants" element={<ProductVariantsPage />} />
                <Route path="catalog/combos" element={<CombosAdminPage />} />
                <Route path="catalog/categories" element={<CategoriesPage />} />
                <Route path="catalog/brands" element={<BrandsPage />} />
                <Route path="catalog/models" element={<ModelsPage />} />
                <Route path="catalog/statistics" element={<StatisticsDashboardPage />} />
                <Route path="inventory/receipts" element={<InventoryReceiptsPage />} />
                <Route path="inventory/ledger" element={<InventoryLedgerPage />} />
              </Route>

              <Route element={<RequireRole allowedRoles={["manager", "admin"]} message="Chỉ manager/admin được truy cập." />}>
                <Route path="management/staff" element={<StaffManagementPage />} />
              </Route>

              <Route element={<RequireRole allowedRoles={["admin"]} message="Chỉ admin được truy cập." />}>
                <Route path="management/managers" element={<ManagersManagementPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
      <Toaster />
    </>
  );
}
