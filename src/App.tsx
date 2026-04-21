import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ProtectedCatalogAdminRoute from "@/components/admin/ProtectedCatalogAdminRoute";
import ProtectedManagersManagementRoute from "@/components/admin/ProtectedManagersManagementRoute";
import ProtectedStaffManagementRoute from "@/components/admin/ProtectedStaffManagementRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/pages/admin/AdminLayout";
import BrandsPage from "@/pages/admin/catalog/BrandsPage";
import CategoriesPage from "@/pages/admin/catalog/CategoriesPage";
import ModelsPage from "@/pages/admin/catalog/ModelsPage";
import ProductCreatePage from "@/pages/admin/catalog/ProductCreatePage";
import ProductListPage from "@/pages/admin/catalog/ProductListPage";
import ProductVariantsPage from "@/pages/admin/catalog/ProductVariantsPage";
import ManagementLayout from "@/pages/admin/management/ManagementLayout";
import ManagersManagementPage from "@/pages/admin/management/ManagersManagementPage";
import StaffManagementPage from "@/pages/admin/management/StaffManagementPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import HomePage from "@/pages/HomePage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import CheckoutReturnPage from "@/pages/CheckoutReturnPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";
import CheckoutFailPage from "@/pages/CheckoutFailPage";
import OrderSuccessPage from "@/pages/OrderSuccessPage";
import OrdersHistoryPage from "@/pages/OrdersHistoryPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ProfilePage from "@/pages/ProfilePage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import VerifyPendingPage from "@/pages/auth/VerifyPendingPage";
import ResendVerificationPage from "@/pages/auth/ResendVerificationPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/checkout/return" element={<CheckoutReturnPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/fail" element={<CheckoutFailPage />} />
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

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-success"
          element={
            <ProtectedRoute>
              <OrderSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/catalog/products" replace />} />
        <Route
          path="/admin/catalog"
          element={
            <ProtectedCatalogAdminRoute>
              <AdminLayout />
            </ProtectedCatalogAdminRoute>
          }
        >
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductCreatePage />} />
          <Route path="products/:productId/variants" element={<ProductVariantsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="models" element={<ModelsPage />} />
        </Route>

        <Route
          path="/admin/management"
          element={
            <ProtectedStaffManagementRoute>
              <ManagementLayout />
            </ProtectedStaffManagementRoute>
          }
        >
          <Route index element={<Navigate to="staff" replace />} />
          <Route path="staff" element={<StaffManagementPage />} />
          <Route
            path="managers"
            element={
              <ProtectedManagersManagementRoute>
                <ManagersManagementPage />
              </ProtectedManagersManagementRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
