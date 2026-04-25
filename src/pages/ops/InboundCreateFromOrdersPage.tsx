import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { autoGenerateInboundByOrders } from "@/services/ops-inbound.service";
import { fetchAllOrders } from "@/services/order.service";

function readNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function fmtMoney(v: unknown): string {
  const n = readNum(v);
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

export default function InboundCreateFromOrdersPage() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [rawOrderIds, setRawOrderIds] = useState("");
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const debtOrdersQuery = useQuery({
    queryKey: ["ops", "inbound", "debt-orders"],
    queryFn: () => fetchAllOrders({ status: "confirmed", limit: 100, page: 1 }),
  });

  const manualOrderIds = useMemo(
    () => rawOrderIds.split(/[\n,;\s]+/).map((x) => x.trim()).filter(Boolean),
    [rawOrderIds]
  );
  const orderIds = useMemo(
    () => Array.from(new Set([...selectedOrderIds, ...manualOrderIds])),
    [selectedOrderIds, manualOrderIds]
  );
  const debtOrders = useMemo(() => {
    const root = debtOrdersQuery.data as Record<string, unknown> | undefined;
    const items = Array.isArray(root?.items)
      ? (root?.items as Array<Record<string, unknown>>)
      : Array.isArray(root?.data)
        ? (root?.data as Array<Record<string, unknown>>)
        : [];
    return items.filter((o) => {
      const rem = readNum((o as Record<string, unknown>).remaining_amount);
      return rem == null || rem > 0;
    });
  }, [debtOrdersQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => autoGenerateInboundByOrders(orderIds),
    onSuccess: (res) => {
      const data = (res.data && typeof res.data === "object") ? (res.data as Record<string, unknown>) : null;
      setPreviewData(data);
      toast.success(typeof res.message === "string" ? res.message : "Đã tạo phiếu nhập tự động.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể tạo phiếu nhập từ đơn nợ.")),
  });

  const previewItems = Array.isArray(previewData?.items) ? (previewData?.items as Array<Record<string, unknown>>) : [];
  const referenceOrders = Array.isArray(previewData?.reference_orders) ? (previewData?.reference_orders as Array<unknown>) : [];
  const inboundId = String((previewData?._id ?? previewData?.id ?? "") || "");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/ops/inbound" className="text-sm font-medium text-teal-600 hover:underline">← Danh sách phiếu nhập</Link>
        <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu nhập từ đơn nợ</h1>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Chọn từ danh sách đơn nợ hoặc nhập thủ công `orderIds`.</p>
        <div className="mt-3 rounded-lg border border-slate-200">
          <div className="max-h-64 overflow-auto">
            {debtOrdersQuery.isPending ? (
              <p className="p-3 text-sm text-slate-500">Đang tải đơn nợ...</p>
            ) : debtOrdersQuery.isError ? (
              <p className="p-3 text-sm text-red-600">{getApiErrorMessage(debtOrdersQuery.error, "Không tải được danh sách đơn nợ.")}</p>
            ) : debtOrders.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">Không có đơn nợ để chọn.</p>
            ) : (
              <table className="w-full min-w-[680px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Chọn</th>
                    <th className="px-3 py-2 text-left">Order ID</th>
                    <th className="px-3 py-2 text-left">Khách</th>
                    <th className="px-3 py-2 text-left">Còn nợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtOrders.map((o, idx) => {
                    const oid = String(o._id ?? o.id ?? o.order_id ?? idx);
                    const checked = selectedOrderIds.includes(oid);
                    return (
                      <tr key={oid}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedOrderIds((prev) => e.target.checked ? [...prev, oid] : prev.filter((x) => x !== oid));
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{oid}</td>
                        <td className="px-3 py-2">{String(o.user_id ?? "—")}</td>
                        <td className="px-3 py-2">{fmtMoney((o as Record<string, unknown>).remaining_amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <textarea
          value={rawOrderIds}
          onChange={(e) => setRawOrderIds(e.target.value)}
          rows={6}
          placeholder="66f...&#10;66a..."
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-400"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button type="button" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending || orderIds.length === 0} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
          </Button>
          <span className="text-xs text-slate-500">Đã chọn: {orderIds.length} đơn</span>
        </div>
      </section>

      {previewData ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Đơn tham chiếu: {referenceOrders.length}</p>
            {referenceOrders.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {referenceOrders.map((x, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{String(x)}</span>)}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Ảnh</th>
                  <th className="px-4 py-3 text-left">Số lượng</th>
                  <th className="px-4 py-3 text-left">Giá nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewItems.map((item, idx) => {
                  const variant = item.variant && typeof item.variant === "object" ? (item.variant as Record<string, unknown>) : {};
                  const image = Array.isArray(variant.images) ? variant.images.find((x): x is string => typeof x === "string" && Boolean(x.trim())) : "";
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-3">{String(item.sku ?? variant.sku ?? "—")}</td>
                      <td className="px-4 py-3">
                        {image ? <img src={image} alt="variant" className="h-10 w-10 rounded border border-slate-200 object-cover" /> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold">{readNum(item.qty) ?? "—"}</td>
                      <td className="px-4 py-3">{fmtMoney(item.import_price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Link to="/ops/inbound"><Button type="button" variant="outline">Quay lại danh sách</Button></Link>
            {inboundId ? <Link to={`/ops/inbound/${encodeURIComponent(inboundId)}`}><Button type="button" className="bg-indigo-600 hover:bg-indigo-700">Mở chi tiết phiếu</Button></Link> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
