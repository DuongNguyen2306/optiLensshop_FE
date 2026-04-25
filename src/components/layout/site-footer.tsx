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
    <footer
      className={cn(
        "border-t border-[#c4a35a]/25 bg-gradient-to-b from-[#1a1d28] via-[#12171f] to-[#0a0c10] text-stone-300/95",
        className
      )}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#2BBBAD]/70 to-transparent opacity-80" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-light tracking-wide text-stone-100">MYLENS</h3>
            <p className="text-sm leading-relaxed text-stone-400">
              Hệ thống kính mắt chuyên nghiệp với nhiều năm kinh nghiệm. Chúng tôi cam kết mang đến trải nghiệm mua sắm tốt nhất cho bạn.
            </p>
            <button
              type="button"
              className="rounded-sm border border-[#c4a35a] bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4c4a8] transition duration-300 ease-in-out hover:bg-[#c4a35a]/10"
            >
              Góp ý cho Shop
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9a7b4f]">Liên hệ</h3>
            <ul className="space-y-3 text-sm text-stone-400">
              <li className="flex items-start gap-2">
                <IconPhone className="mt-0.5 h-4 w-4 shrink-0 text-[#2BBBAD]" />
                <div>
                  <p className="font-medium text-stone-200">Hotline</p>
                  <p>1900 0359</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <IconGlobe className="mt-0.5 h-4 w-4 shrink-0 text-[#2BBBAD]" />
                <div>
                  <p className="font-medium text-stone-200">Email</p>
                  <p>MYLENS@gmail.com</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9a7b4f]">Liên kết nhanh</h3>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <a href="#" className="transition duration-200 ease-in-out hover:text-[#2BBBAD]">
                  Về chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="transition duration-200 ease-in-out hover:text-[#2BBBAD]">
                  Sản phẩm
                </a>
              </li>
              <li>
                <a href="#" className="transition duration-200 ease-in-out hover:text-[#2BBBAD]">
                  Dịch vụ
                </a>
              </li>
              <li>
                <a href="#" className="transition duration-200 ease-in-out hover:text-[#2BBBAD]">
                  Chính sách
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9a7b4f]">Kết nối</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/50 bg-stone-800/40 text-stone-300 transition duration-300 ease-in-out hover:border-[#2BBBAD] hover:text-[#2BBBAD]"
                aria-label="Facebook"
              >
                <span className="text-sm font-bold">f</span>
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/50 bg-stone-800/40 text-stone-300 transition duration-300 ease-in-out hover:border-[#2BBBAD] hover:text-[#2BBBAD]"
                aria-label="Instagram"
              >
                <span className="text-sm font-bold">in</span>
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/50 bg-stone-800/40 text-stone-300 transition duration-300 ease-in-out hover:border-[#2BBBAD] hover:text-[#2BBBAD]"
                aria-label="Website"
              >
                <IconGlobe className="h-5 w-5" />
              </a>
              <a
                href="tel:19000359"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/50 bg-stone-800/40 text-stone-300 transition duration-300 ease-in-out hover:border-[#2BBBAD] hover:text-[#2BBBAD]"
                aria-label="Gọi ngay"
              >
                <IconPhone className="h-5 w-5" />
              </a>
            </div>
            {SHOW_API_DOCS_FOOTER && (
              <p className="mt-3 border-t border-stone-600/60 pt-3">
                <a
                  href={API_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-stone-500 transition duration-200 hover:text-[#2BBBAD]"
                >
                  Tài liệu API (Swagger)
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-stone-600/50 pt-8">
          <p className="text-center text-sm text-stone-500">
            © {new Date().getFullYear()} Mylens. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
}
