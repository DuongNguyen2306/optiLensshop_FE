import { ReactNode } from "react";
import AuthFeatures from "@/components/auth/auth-features";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  description: string;
  /** Ảnh cột trái trong thẻ (model / lifestyle). */
  imageSrc: string;
  imageAlt: string;
  children: ReactNode;
  /** Căn tiêu đề form theo mẫu đăng ký (giữa) hoặc đăng nhập (trái). */
  titleAlign?: "left" | "center";
}

export default function AuthShell({
  title,
  description,
  imageSrc,
  imageAlt,
  children,
  titleAlign = "left",
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f5]">
      <SiteHeader />
      <main className="flex flex-1 flex-col py-8 md:py-12">
        <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-100">
            <div className="grid md:grid-cols-2">
              <div className="relative hidden min-h-[420px] md:block">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:py-12">
                <div className={cn(titleAlign === "center" && "text-center")}>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
                </div>
                <div className="mt-8">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AuthFeatures />
      <SiteFooter className="mt-auto" />
    </div>
  );
}
