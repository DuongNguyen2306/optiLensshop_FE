import { AlertCircle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { n } from "@/lib/finance-format";

type Props = {
  missingCount: number;
  legacyCount: number;
  className?: string;
};

export function DataQualityStrip({ missingCount, legacyCount, className }: Props) {
  if (n(missingCount) <= 0 && n(legacyCount) <= 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-stretch", className)}>
      {n(missingCount) > 0 ? (
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0">
            Một số sản phẩm bán trong kỳ <strong>chưa đủ giá vốn (unit cost)</strong> — COGS có thể bị thiếu.{" "}
            <span className="ml-1 inline-flex items-center rounded-full border border-amber-400/60 bg-white px-2 py-0.5 text-xs font-semibold text-amber-900">
              {n(missingCount)} biến thể
            </span>
          </p>
        </div>
      ) : null}
      {n(legacyCount) > 0 ? (
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-sky-300/80 bg-sky-50/90 px-3 py-2.5 text-sm text-sky-950">
          <Database className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0">
            Một phần giá vốn từ <strong>dữ liệu nhập kho legacy</strong> (nên chuyển dần về phiếu mới).{" "}
            <span className="ml-1 inline-flex items-center rounded-full border border-sky-400/60 bg-white px-2 py-0.5 text-xs font-semibold text-sky-900">
              {n(legacyCount)} dòng/variant
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
