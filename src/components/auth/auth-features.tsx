import { cn } from "@/lib/utils";

const items = [
  {
    title: "Bảo hành trọn đời",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Đo mắt miễn phí",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    title: "Thu cũ đổi mới",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "Vệ sinh và bảo quản kính",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M4.5 19.125h15A2.25 2.25 0 0021.75 17V5.25A2.25 2.25 0 0019.5 3h-15a2.25 2.25 0 00-2.25 2.25v11.25A2.25 2.25 0 004.5 19.125z" />
      </svg>
    ),
  },
];

interface AuthFeaturesProps {
  className?: string;
}

export default function AuthFeatures({ className }: AuthFeaturesProps) {
  return (
    <section className={cn("bg-[#e8f6f3] py-6", className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-4 lg:px-6">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-[#2bb6a3]/15"
          >
            <span className="text-[#2bb6a3]">{item.icon}</span>
            {item.title}
          </div>
        ))}
      </div>
    </section>
  );
}
