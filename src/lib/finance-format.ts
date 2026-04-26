export function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}

export function vnd(v: unknown): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Math.round(n(v)));
}

export function vndShort(v: unknown, unit: "K" | "M" = "K"): string {
  const x = n(v);
  if (unit === "M" && Math.abs(x) >= 1_000_000) {
    return `${(x / 1_000_000).toFixed(1)}M₫`;
  }
  if (Math.abs(x) >= 1000) {
    return `${Math.round(x / 1000).toLocaleString("vi-VN")}K₫`;
  }
  return vnd(x);
}
