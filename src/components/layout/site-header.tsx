import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Trang chủ" },
  { href: "#", label: "Gọng kính" },
  { href: "#", label: "Tròng kính" },
  { href: "#", label: "Kính râm" },
  { to: "/combos", label: "Combo" },
  { href: "#", label: "Xem thêm" },
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
    <Link to="/" className="flex items-center gap-2 text-slate-900">
      <span className="grid h-9 w-9 place-content-center rounded border border-slate-200 text-xs font-bold tracking-tight">
        A
      </span>
      <span className="hidden font-semibold sm:inline">anna</span>
    </Link>
  );
}

interface SiteHeaderProps {
  rightSlot?: ReactNode;
  cartCount?: number;
  className?: string;
}

export default function SiteHeader({ rightSlot, cartCount = 0, className }: SiteHeaderProps) {
  return (
    <header className={cn("border-b border-slate-100 bg-white", className)}>
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 lg:px-6">
        <LogoMark />
        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm text-slate-700 md:flex">
          {navItems.map((item) =>
            "to" in item ? (
              <Link key={item.label} to={item.to} className="whitespace-nowrap transition hover:text-[#2bb6a3]">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className="whitespace-nowrap transition hover:text-[#2bb6a3]">
                {item.label}
              </a>
            )
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-slate-700">
          <button type="button" className="rounded-full p-2 transition hover:bg-slate-50" aria-label="Tìm kiếm">
            <IconSearch className="h-5 w-5" />
          </button>
          {rightSlot ?? (
            <>
              <Link to="/login" className="rounded-full p-2 transition hover:bg-slate-50" aria-label="Tài khoản">
                <IconUser className="h-5 w-5" />
              </Link>
              <button type="button" className="relative rounded-full p-2 transition hover:bg-slate-50" aria-label="Giỏ hàng">
                <IconBag className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
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
