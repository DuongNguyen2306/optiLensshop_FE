import { n, vnd } from "@/lib/finance-format";

/** Mọi số tiền hiển thị UI — luôn qua hàm này (VND, làm tròn số nguyên). */
export function formatCurrency(value: unknown): string {
  return vnd(value);
}

export function parseMoney(value: unknown): number {
  return n(value);
}
