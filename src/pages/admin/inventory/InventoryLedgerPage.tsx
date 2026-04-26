import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listInventoryLedger } from "@/services/inventory.service";
import { getApiErrorMessage } from "@/lib/api-error";

const LEDGER_EVENT_TYPES = ["", "receipt_confirmed", "order_reserved", "order_confirmed", "order_cancelled", "manual_adjustment"] as const;

function date(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

function variantLabel(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return String(o._id ?? o.id ?? "—");
  }
  return "—";
}

export default function InventoryLedgerPage() {
  const [variantId, setVariantId] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const ledgerQuery = useQuery({
    queryKey: ["inventory", "ledger", page, limit, variantId, eventType],
    queryFn: () =>
      listInventoryLedger({
        page,
        variant_id: variantId || undefined,
        limit,
        event_type: eventType || undefined,
      }),
  });

  const rows = ledgerQuery.data?.items ?? [];
  const pagination = ledgerQuery.data?.pagination;
  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.total_pages ?? 1;
  const totalRows = pagination?.total ?? rows.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Ledger</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi biến động tồn kho và reserved theo từng sự kiện.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="inline-flex items-center gap-1">
            <Filter className="h-4 w-4" /> Lọc theo Variant ID
          </Label>
          <Input
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setPage(1);
            }}
            placeholder="variant_id..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Event type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
          >
            {LEDGER_EVENT_TYPES.map((event) => (
              <option key={event || "all"} value={event}>
                {event || "Tất cả sự kiện"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Giới hạn dòng</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
        Tổng bản ghi: <span className="font-semibold text-slate-900">{totalRows}</span> | Trang{" "}
        <span className="font-semibold text-slate-900">
          {currentPage}/{totalPages}
        </span>
      </div>

      {ledgerQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải ledger...</p>
      ) : ledgerQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(ledgerQuery.error, "Không tải được inventory ledger.")}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <BookOpenText className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">Không có sự kiện ledger.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-left">Variant</th>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Delta</th>
                  <th className="px-4 py-3 text-left">Stock (before/after)</th>
                  <th className="px-4 py-3 text-left">Reserved (before/after)</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const id = String(r._id ?? r.id ?? idx);
                  const delta = Number(r.quantity_delta ?? 0);
                  return (
                    <tr key={id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">{date(r.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{variantLabel(r.variant_id)}</td>
                      <td className="px-4 py-3">{String(r.event_type ?? "—")}</td>
                      <td className={`px-4 py-3 font-semibold ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        {Number(r.stock_before ?? 0).toLocaleString("vi-VN")} → {Number(r.stock_after ?? 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        {Number(r.reserved_before ?? 0).toLocaleString("vi-VN")} → {Number(r.reserved_after ?? 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {String(r.ref_type ?? "—")} / {String(r.ref_id ?? "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trang trước
            </Button>
            <Button type="button" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
