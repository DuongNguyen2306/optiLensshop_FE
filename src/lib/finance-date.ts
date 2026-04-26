/**
 * Chuẩn hóa kỳ theo dạng input `YYYY-MM-DD` → ISO cho query BE.
 * Summary dùng `start_date` / `end_date`; admin analytics dùng `startDate` / `endDate`.
 */
export function dateInputsToIsoRange(start: string, end: string): { startIso: string; endIso: string } | null {
  if (!start?.trim() || !end?.trim()) return null;
  const s = new Date(`${start.trim()}T00:00:00.000+07:00`);
  const e = new Date(`${end.trim()}T23:59:59.999+07:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s.getTime() > e.getTime()) {
    return null;
  }
  return { startIso: s.toISOString(), endIso: e.toISOString() };
}

/** Query cho GET /finance/summary, GET /finance/reconciliation/inventory */
export function parseFinanceDateQueryForSummary(start: string, end: string): Record<string, string> | undefined {
  const range = dateInputsToIsoRange(start, end);
  if (!range) return undefined;
  return {
    start_date: range.startIso,
    end_date: range.endIso,
  };
}

/** Query cho GET /api/admin/analytics/finance (theo convention hiện tại của BE). */
export function parseFinanceDateQueryForAdmin(start: string, end: string): Record<string, string> | undefined {
  const range = dateInputsToIsoRange(start, end);
  if (!range) return undefined;
  return {
    startDate: range.startIso,
    endDate: range.endIso,
  };
}
