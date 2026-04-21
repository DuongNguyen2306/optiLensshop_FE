import { cn } from "@/lib/utils";

const API_DOCS_URL =
  import.meta.env.VITE_API_DOCS_URL ?? "http://localhost:8080/api-docs/";

/** Swagger chỉ hiện khi bật cờ — tránh đưa link kỹ thuật ra giao diện khách hàng (kể cả dev). */
const SHOW_API_DOCS_FOOTER = import.meta.env.VITE_SHOW_API_DOCS === "true";

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

interface SiteFooterProps {
  className?: string;
}

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("border-t border-stone-200 bg-[#f5f1eb]", className)}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3 md:gap-8 lg:px-8">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Góp ý</h3>
          <p className="mt-2 text-sm text-slate-600">
            Anna luôn lắng nghe ý kiến của bạn để hoàn thiện trải nghiệm mua sắm.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md border border-[#2bb6a3] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#2bb6a3] transition hover:bg-[#2bb6a3]/10"
          >
            Đóng góp ý kiến
          </button>
        </div>
        <div className="text-sm text-slate-600 md:text-center">
          <p className="font-medium text-slate-900">Liên hệ</p>
          <p className="mt-2">Hotline: 1900 0359</p>
          <p>Email: marketing@kinhmatanna.com</p>
          {SHOW_API_DOCS_FOOTER ? (
            <p className="mt-3">
              <a
                href={API_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#2bb6a3] hover:underline"
              >
                Tài liệu API (Swagger)
              </a>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <span className="text-sm font-medium text-slate-900">Kết nối</span>
          <div className="flex gap-3 text-[#2bb6a3]">
            <a href="#" className="rounded-full border border-stone-200 bg-white p-2 hover:bg-stone-50" aria-label="Điện thoại">
              <IconPhone className="h-5 w-5" />
            </a>
            <a href="#" className="rounded-full border border-stone-200 bg-white p-2 hover:bg-stone-50" aria-label="Facebook">
              <span className="text-xs font-bold">f</span>
            </a>
            <a href="#" className="rounded-full border border-stone-200 bg-white p-2 hover:bg-stone-50" aria-label="Website">
              <IconGlobe className="h-5 w-5" />
            </a>
            <a href="#" className="rounded-full border border-stone-200 bg-white p-2 hover:bg-stone-50" aria-label="Instagram">
              <span className="text-xs font-bold">in</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
