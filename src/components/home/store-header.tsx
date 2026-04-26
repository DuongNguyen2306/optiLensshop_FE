import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/layout/site-header";
import { getCart } from "@/services/shop.service";
import { cartItemCountFromResponse } from "@/lib/cart-utils";
import { canManageCatalog } from "@/lib/catalog-roles";
import { canAccessInternalOrders, canAccessStaffManagement } from "@/lib/management-roles";
import { useAppSelector } from "@/store/hooks";

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconBag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974a1.125 1.125 0 011.119 1.007z" />
    </svg>
  );
}

export default function StoreHeader() {
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);
  const initial = (user?.email ?? "U").charAt(0).toUpperCase();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
    enabled: Boolean(token),
  });
  const cartCount = token ? cartItemCountFromResponse(cartQuery.data) : 0;

  return (
    <SiteHeader
      cartCount={cartCount}
      rightSlot={
        <>
          {isAuthenticated && user && canManageCatalog(user.role) ? (
            <Link
              to="/admin/catalog/products"
              className="hidden text-sm font-medium text-stone-600 transition duration-200 hover:text-[#2BBBAD] sm:inline"
              title="Quản lý catalog"
            >
              Quản lý catalog
            </Link>
          ) : null}
          {isAuthenticated && user && canAccessStaffManagement(user.role) ? (
            <Link
              to="/admin/management/staff"
              className="hidden text-sm font-medium text-stone-600 transition duration-200 hover:text-[#2BBBAD] sm:inline"
              title="Quản lý nhân sự"
            >
              Nhân sự
            </Link>
          ) : null}
          {isAuthenticated && user && canAccessInternalOrders(user.role) ? (
            <Link
              to="/admin/orders"
              className="hidden text-sm font-medium text-stone-600 transition duration-200 hover:text-[#2BBBAD] sm:inline"
              title="Đơn nội bộ"
            >
              Đơn nội bộ
            </Link>
          ) : null}
          {isAuthenticated && (user?.role ?? "").toLowerCase() === "customer" ? (
            <Link
              to="/orders"
              className="text-sm font-medium text-stone-600 transition duration-200 hover:text-[#2BBBAD]"
              title="Đơn hàng của tôi"
            >
              Đơn hàng
            </Link>
          ) : null}
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2BBBAD]/25 bg-[#2BBBAD]/10 text-sm font-semibold text-[#1a6b63] transition hover:bg-[#2BBBAD]/18"
              title={user?.email ?? "Hồ sơ"}
            >
              {initial}
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full p-2 transition duration-200 ease-in-out hover:bg-stone-100/90 hover:text-[#2BBBAD]"
              aria-label="Đăng nhập"
            >
              <IconUser className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/cart"
            className="relative rounded-full p-2 transition duration-200 ease-in-out hover:bg-stone-100/90 hover:text-[#2BBBAD]"
            aria-label="Giỏ hàng"
          >
            <IconBag className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </Link>
        </>
      }
    />
  );
}
