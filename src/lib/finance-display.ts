/** Hiển thị thân thiện — không in key thô từ BE lên UI. */

const STATUS_VI: Record<string, string> = {
  completed: "Hoàn tất",
  complete: "Hoàn tất",
  pending: "Đang xử lý",
  processing: "Đang xử lý",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  shipped: "Đang giao",
  delivered: "Đã giao",
};

export function orderOrPaymentLabelVi(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_VI[k] ?? raw.replace(/_/g, " ");
}

export function formatFinancePeriodVi(period: unknown): string {
  if (!period || typeof period !== "object") return "—";
  const p = period as Record<string, unknown>;
  const start = String(p.startDate ?? p.start_date ?? "").trim();
  const end = String(p.endDate ?? p.end_date ?? "").trim();
  if (start && end) {
    return `${formatIsoDateVi(start)} → ${formatIsoDateVi(end)}`;
  }
  return "—";
}

function formatIsoDateVi(iso: string): string {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  }
  return iso;
}

/** Ghi chú reconciliation / API: chuỗi hoặc danh sách dòng (không dump JSON). */
export function flattenNotesForDisplay(notes: unknown): string {
  if (notes == null) return "";
  if (typeof notes === "string") return notes.trim();
  if (typeof notes === "object" && !Array.isArray(notes)) {
    const o = notes as Record<string, unknown>;
    return Object.entries(o)
      .map(([key, val]) => {
        const label = key.replace(/_/g, " ");
        if (val != null && typeof val === "object" && !Array.isArray(val)) return `${label}: (chi tiết đính kèm)`;
        if (Array.isArray(val)) return `${label}: ${val.length} mục`;
        return `${label}: ${String(val)}`;
      })
      .join("\n");
  }
  return String(notes);
}
