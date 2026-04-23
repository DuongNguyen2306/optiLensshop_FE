import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, CheckCircle2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInventoryReceipt, confirmInventoryReceipt, listInventoryReceipts } from "@/services/inventory.service";
import { getApiErrorMessage } from "@/lib/api-error";

const RECEIPT_STATUSES = ["", "draft", "confirmed", "cancelled"] as const;

function money(v: number | undefined): string {
  if (!Number.isFinite(v ?? NaN)) return "—";
  return `${Math.round(v ?? 0).toLocaleString("vi-VN")}đ`;
}

function date(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

export default function InventoryReceiptsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qtyIn, setQtyIn] = useState("10");
  const [unitCost, setUnitCost] = useState("0");
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");

  const receiptsQuery = useQuery({
    queryKey: ["inventory", "receipts", page, limit, statusFilter, variantFilter],
    queryFn: () =>
      listInventoryReceipts({
        page,
        limit,
        status: statusFilter || undefined,
        variant_id: variantFilter || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createInventoryReceipt({
        variant_id: variantId.trim(),
        qty_in: Number(qtyIn),
        unit_cost: Number(unitCost),
        supplier_name: supplierName.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success("Đã tạo phiếu nhập kho.");
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["inventory", "receipts"] });
      setNote("");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể tạo phiếu nhập.")),
  });

  const confirmMutation = useMutation({
    mutationFn: (receiptId: string) => confirmInventoryReceipt(receiptId),
    onSuccess: async () => {
      toast.success("Đã xác nhận phiếu nhập.");
      await queryClient.invalidateQueries({ queryKey: ["inventory", "receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "ledger"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể xác nhận phiếu nhập.")),
  });

  const rows = receiptsQuery.data?.items ?? [];
  const pagination = receiptsQuery.data?.pagination;
  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.total_pages ?? 1;
  const totalRows = pagination?.total ?? rows.length;

  const summary = useMemo(() => {
    const totalQty = rows.reduce((acc, r) => acc + Number(r.qty_in ?? 0), 0);
    return { totalQty, pageRows: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Receipts</h1>
        <p className="mt-1 text-sm text-slate-600">Quản lý phiếu nhập kho (tạo draft, xác nhận và theo dõi trạng thái).</p>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Trạng thái</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {RECEIPT_STATUSES.map((status) => (
              <option key={status || "all"} value={status}>
                {status ? status : "Tất cả trạng thái"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Lọc theo Variant ID</Label>
          <Input
            value={variantFilter}
            onChange={(e) => {
              setVariantFilter(e.target.value);
              setPage(1);
            }}
            placeholder="variant_id..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Số dòng / trang</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Trang hiện tại</Label>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
            {currentPage} / {totalPages}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label>Variant ID</Label>
          <Input value={variantId} onChange={(e) => setVariantId(e.target.value)} placeholder="variant_id" />
        </div>
        <div className="space-y-1.5">
          <Label>Số lượng nhập</Label>
          <Input value={qtyIn} onChange={(e) => setQtyIn(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Đơn giá nhập</Label>
          <Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Nhà cung cấp</Label>
          <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label>Ghi chú</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <div className="lg:col-span-5">
          <Button
            type="button"
            className="rounded-xl bg-teal-500 text-white hover:bg-teal-600"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !variantId.trim()}
          >
            <PackagePlus className="h-4 w-4" />
            {createMutation.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Tổng phiếu (theo filter)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalRows}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Số lượng nhập (trang hiện tại)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.totalQty.toLocaleString("vi-VN")}</p>
        </div>
      </section>

      {receiptsQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải phiếu nhập...</p>
      ) : receiptsQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(receiptsQuery.error, "Không tải được phiếu nhập.")}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <Warehouse className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">Chưa có phiếu nhập nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt ID</th>
                  <th className="px-4 py-3 text-left">Variant</th>
                  <th className="px-4 py-3 text-left">SL nhập</th>
                  <th className="px-4 py-3 text-left">Đơn giá</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const id = String(r._id ?? r.id ?? idx);
                  const variant = r.variant_id;
                  const variantLabel =
                    typeof variant === "string"
                      ? variant
                      : String((variant as Record<string, unknown> | undefined)?._id ?? "—");
                  const status = String(r.status ?? "");
                  return (
                    <tr key={id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{id}</td>
                      <td className="px-4 py-3">{variantLabel}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{Number(r.qty_in ?? 0).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3">{money(r.unit_cost)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{status || "—"}</span>
                      </td>
                      <td className="px-4 py-3">{date(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {status === "draft" ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => confirmMutation.mutate(id)}
                            disabled={confirmMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Xác nhận
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
