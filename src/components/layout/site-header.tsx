import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isHeaderNavActive } from "@/lib/nav-active";

const navItems = [
  { to: "/", label: "Trang chủ" },
  { to: "/products?type=frame", label: "Gọng kính" },
  { to: "/products?type=lens", label: "Tròng kính" },
  { to: "/products?search=kinh%20ram", label: "Kính râm" },
  { to: "/combos", label: "Combo" },
  { to: "/products", label: "Xem thêm" },
];

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

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

function LogoMark() {
  return (
    <Link
      to="/"
      className="group flex min-w-0 shrink-0 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2BBBAD]/50"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1 shadow-sm ring-1 ring-stone-200/50 transition duration-300 ease-out will-change-transform group-hover:scale-[1.02] group-hover:shadow-md group-hover:ring-stone-300/60 group-active:scale-[0.99] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
        <img
          src="/images/logo.png"
          alt="MYLENS Eyewear Store"
          width={44}
          height={44}
          className="block h-full w-full object-contain object-center"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </span>
      <span className="hidden text-xl font-semibold tracking-[0.25em] text-[#1f2a44] sm:inline">
        MYLENS
      </span>
    </Link>
  );
}

interface SiteHeaderProps {
  rightSlot?: ReactNode;
  cartCount?: number;
  className?: string;
}

export default function SiteHeader({ rightSlot, cartCount = 0, className }: SiteHeaderProps) {
  const { pathname, search } = useLocation();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-stone-200/50 bg-white/80 shadow-[0_4px_30px_-8px_rgba(15,18,25,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-white/70",
        className
      )}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#2BBBAD] to-transparent opacity-90" aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5 lg:px-6">
        <LogoMark />
        <nav className="hidden flex-1 items-center justify-center gap-7 text-sm md:flex" aria-label="Menu chính">
          {navItems.map((item) => {
            const active = isHeaderNavActive(item.to, pathname, search);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "border-b-2 py-0.5 text-sm font-medium tracking-wide transition-all duration-300 ease-in-out",
                  active
                    ? "border-[#2BBBAD] text-[#2BBBAD]"
                    : "border-transparent text-stone-600 hover:border-[#2BBBAD]/40 hover:text-[#2BBBAD]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2.5 text-stone-600 sm:gap-3">
          <button
            type="button"
            className="rounded-full p-2 transition duration-200 ease-in-out hover:bg-stone-100/90 hover:text-[#2BBBAD]"
            aria-label="Tìm kiếm"
          >
            <IconSearch className="h-5 w-5" />
          </button>
          {rightSlot ?? (
            <>
              <Link
                to="/login"
                className="rounded-full p-2 transition duration-200 ease-in-out hover:bg-stone-100/90 hover:text-[#2BBBAD]"
                aria-label="Tài khoản"
              >
                <IconUser className="h-5 w-5" />
              </Link>
              <button
                type="button"
                className="relative rounded-full p-2 transition duration-200 ease-in-out hover:bg-stone-100/90 hover:text-[#2BBBAD]"
                aria-label="Giỏ hàng"
              >
                <IconBag className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#2BBBAD] px-0.5 text-[10px] font-bold text-white shadow-sm">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                ) : null}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
