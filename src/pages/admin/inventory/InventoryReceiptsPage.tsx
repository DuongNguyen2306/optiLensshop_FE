import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { createInbound } from "@/api/inboundApi";
import { INBOUND_STATUS_LABEL, INBOUND_STATUS_OPTIONS, INBOUND_TYPE_LABEL, INBOUND_TYPE_OPTIONS } from "@/constants/inbound";
import { useInboundsList } from "@/hooks/useInboundsList";
import { useInboundActions } from "@/hooks/useInboundActions";
import { normalizeRole } from "@/lib/role-routing";
import { useAppSelector } from "@/store/hooks";
import type { InboundItemInput, InboundPayload, InboundType } from "@/types/inbound";
import { parseApiError } from "@/utils/parseApiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmtMoney(v: number | undefined): string {
  if (!Number.isFinite(v ?? NaN)) return "—";
  return `${Math.round(v ?? 0).toLocaleString("vi-VN")}đ`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

function extractReferenceOrderIds(row: Record<string, unknown>): string[] {
  const direct = [row.reference_order_id, row.reference_order, row.order_id]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  const refs = row.reference_orders;
  const nested = Array.isArray(refs)
    ? refs
        .map((ref) => {
          if (typeof ref === "string") return ref.trim();
          if (ref && typeof ref === "object") {
            const o = ref as Record<string, unknown>;
            const id = o._id ?? o.id ?? o.order_id ?? o.reference_order_id;
            return typeof id === "string" ? id.trim() : "";
          }
          return "";
        })
        .filter(Boolean)
    : [];
  return Array.from(new Set([...direct, ...nested]));
}

function createdByLabel(raw: unknown): string {
  if (!raw) return "—";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const id = o._id ?? o.id ?? o.user_id;
    const email = o.email;
    if (typeof email === "string" && email.trim()) return email.trim();
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "—";
}

export default function InventoryReceiptsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draftType, setDraftType] = useState<InboundType>("PURCHASE");
  const [draftSupplier, setDraftSupplier] = useState("");
  const [draftExpectedDate, setDraftExpectedDate] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [items, setItems] = useState<InboundItemInput[]>([{ variant_id: "", qty_planned: 1, import_price: 0 }]);
  const prefillVariantId = searchParams.get("variant_id")?.trim() ?? "";
  const shouldOpenCreate = searchParams.get("open_create") === "1";
  const refOrderParam = searchParams.get("refOrder")?.trim() ?? "";
  const [referenceOrderId, setReferenceOrderId] = useState(refOrderParam);

  const isOpsRole = role === "operations" || role === "manager" || role === "admin";
  const inboundsQuery = useInboundsList({
    page,
    pageSize,
    status: status || undefined,
    type: type || undefined,
    supplier_name: supplierName || undefined,
    reference_order_id: referenceOrderId || undefined,
  });
  const { submitMutation } = useInboundActions();

  const createMutation = useMutation({
    mutationFn: (payload: InboundPayload) => createInbound(payload),
    onSuccess: async () => {
      toast.success("Tạo phiếu nhập thành công.");
      setShowCreateForm(false);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["inbounds", "list"] });
    },
    onError: (e) => toast.error(parseApiError(e, "Không thể tạo phiếu nhập.")),
  });

  const rowsRaw = inboundsQuery.data?.items ?? [];
  const rows = useMemo(() => {
    if (!referenceOrderId) return rowsRaw;
    return rowsRaw.filter((row) => extractReferenceOrderIds(row as Record<string, unknown>).includes(referenceOrderId));
  }, [rowsRaw, referenceOrderId]);
  const pg = inboundsQuery.data?.pagination ?? { page, pageSize, total: rows.length, totalPages: 1 };

  const totalValuePreview = useMemo(
    () => items.reduce((acc, i) => acc + Math.max(0, i.import_price) * Math.max(0, i.qty_planned), 0),
    [items]
  );

  const canCreate = isOpsRole;

  useEffect(() => {
    if (!canCreate || !prefillVariantId) {
      return;
    }
    setShowCreateForm(true);
    setItems((prev) => {
      const first = prev[0];
      if (first && !first.variant_id.trim()) {
        return [{ ...first, variant_id: prefillVariantId }, ...prev.slice(1)];
      }
      if (prev.some((item) => item.variant_id.trim() === prefillVariantId)) {
        return prev;
      }
      return [{ variant_id: prefillVariantId, qty_planned: 1, import_price: 0 }, ...prev];
    });
  }, [canCreate, prefillVariantId]);

  useEffect(() => {
    if (!canCreate || !shouldOpenCreate) {
      return;
    }
    setShowCreateForm(true);
  }, [canCreate, shouldOpenCreate]);

  const updateItem = (index: number, patch: Partial<InboundItemInput>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { variant_id: "", qty_planned: 1, import_price: 0 }]);
  const removeItem = (index: number) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const submitCreate = () => {
    const normalizedItems = items
      .map((item) => ({
        variant_id: item.variant_id.trim(),
        qty_planned: Math.floor(Number(item.qty_planned) || 0),
        import_price: Number(item.import_price) || 0,
      }))
      .filter((item) => item.variant_id);
    if (normalizedItems.length === 0) {
      toast.error("Cần ít nhất một dòng item hợp lệ.");
      return;
    }
    if (normalizedItems.some((item) => item.qty_planned <= 0)) {
      toast.error("qty_planned phải lớn hơn 0.");
      return;
    }
    if (normalizedItems.some((item) => item.import_price < 0)) {
      toast.error("import_price không được âm.");
      return;
    }
    createMutation.mutate({
      type: draftType,
      supplier_name: draftSupplier.trim() || undefined,
      expected_date: draftExpectedDate || undefined,
      note: draftNote.trim() || undefined,
      items: normalizedItems,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbound Receipts</h1>
          <p className="mt-1 text-sm text-slate-600">Workflow: DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED → COMPLETED/CANCELLED.</p>
        </div>
        {canCreate ? (
          <Button type="button" className="bg-[#2bb6a3]" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            {showCreateForm ? "Ẩn form tạo" : "Tạo phiếu nhập"}
          </Button>
        ) : null}
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
        <div className="space-y-1.5">
          <Label>Trạng thái</Label>
          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            {INBOUND_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {INBOUND_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            {INBOUND_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {INBOUND_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <Input value={supplierName} onChange={(e) => { setSupplierName(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1.5">
          <Label>Ref order</Label>
          <Input
            placeholder="Order ID liên kết"
            value={referenceOrderId}
            onChange={(e) => {
              setReferenceOrderId(e.target.value.trim());
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Page size</Label>
          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Trang</Label>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">{pg.page}/{pg.totalPages}</div>
        </div>
      </section>

      {showCreateForm ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draftType} onChange={(e) => setDraftType(e.target.value as InboundType)}>
                {INBOUND_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {INBOUND_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier name</Label>
              <Input value={draftSupplier} onChange={(e) => setDraftSupplier(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected date</Label>
              <Input type="date" value={draftExpectedDate} onChange={(e) => setDraftExpectedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={draftNote} onChange={(e) => setDraftNote(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Thêm dòng
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-4">
                  <Input placeholder="variant_id" value={item.variant_id} onChange={(e) => updateItem(index, { variant_id: e.target.value })} />
                  <Input type="number" min={1} placeholder="qty_planned" value={item.qty_planned} onChange={(e) => updateItem(index, { qty_planned: Number(e.target.value) })} />
                  <Input type="number" min={0} placeholder="import_price" value={item.import_price} onChange={(e) => updateItem(index, { import_price: Number(e.target.value) })} />
                  <Button type="button" variant="outline" disabled={items.length <= 1} onClick={() => removeItem(index)}>
                    Xóa dòng
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              Tổng giá trị tạm tính: <span className="font-semibold text-slate-900">{fmtMoney(totalValuePreview)}</span>
            </p>
          </div>
          <Button type="button" className="bg-[#2bb6a3]" onClick={submitCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Đang tạo..." : "Lưu DRAFT"}
          </Button>
        </section>
      ) : null}

      {referenceOrderId ? (
        <p className="text-xs text-slate-500">
          Đang lọc theo đơn tham chiếu: <span className="font-mono text-slate-700">{referenceOrderId}</span>
        </p>
      ) : null}

      {inboundsQuery.isPending ? (
        <p className="text-sm text-slate-600">Đang tải danh sách phiếu nhập…</p>
      ) : inboundsQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{parseApiError(inboundsQuery.error, "Không tải được danh sách phiếu nhập.")}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <Warehouse className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">Không có phiếu nhập.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Total value</th>
                  <th className="px-4 py-3 text-left">Created by</th>
                  <th className="px-4 py-3 text-left">Ref orders</th>
                  <th className="px-4 py-3 text-left">Created at</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const id = String(r._id ?? r.id ?? idx);
                  const inboundStatus = String(r.status ?? "DRAFT").toUpperCase();
                  const isHighlighted =
                    Boolean(referenceOrderId) &&
                    extractReferenceOrderIds(r as Record<string, unknown>).includes(referenceOrderId);
                  return (
                    <tr key={id} className={isHighlighted ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50/70"}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{String(r.inbound_code ?? id)}</td>
                      <td className="px-4 py-3">{INBOUND_TYPE_LABEL[String(r.type ?? "")] ?? String(r.type ?? "—")}</td>
                      <td className="px-4 py-3">{INBOUND_STATUS_LABEL[inboundStatus] ?? inboundStatus}</td>
                      <td className="px-4 py-3">{String(r.supplier_name ?? "—")}</td>
                      <td className="px-4 py-3 font-semibold">{fmtMoney(Number(r.total_value ?? 0))}</td>
                      <td className="px-4 py-3">{createdByLabel(r.created_by)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {extractReferenceOrderIds(r as Record<string, unknown>).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">{fmtDate(String(r.createdAt ?? r.created_at ?? ""))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Link to={`/admin/inventory/receipts/${encodeURIComponent(id)}`}>
                            <Button type="button" variant="outline" size="sm">
                              Chi tiết
                            </Button>
                          </Link>
                          {inboundStatus === "DRAFT" && isOpsRole ? (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#2bb6a3]"
                              disabled={submitMutation.isPending}
                              onClick={() => {
                                submitMutation.mutate(id, {
                                  onSuccess: () => toast.success("Đã submit phiếu nhập."),
                                  onError: (e) => toast.error(parseApiError(e, "Không thể submit phiếu nhập.")),
                                });
                              }}
                            >
                              Submit
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Tổng: <span className="font-semibold text-slate-900">{pg.total}</span> phiếu
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={pg.page <= 1 || inboundsQuery.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Trước
              </Button>
              <Button type="button" variant="outline" disabled={pg.page >= pg.totalPages || inboundsQuery.isFetching} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
