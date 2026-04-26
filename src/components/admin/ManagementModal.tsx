import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ManagementModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export default function ManagementModal({ open, title, description, children, footer, onClose }: ManagementModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="management-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="management-modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" className="h-8 shrink-0 px-2 text-slate-500" onClick={onClose} aria-label="Đóng">
            ✕
          </Button>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
