import { Button } from "@/components/ui/button";
import type { ProductVariant } from "@/types/product";

function formatVnd(value: number | undefined): string {
  if (!Number.isFinite(value ?? NaN)) return "—";
  return `${Math.round(value ?? 0).toLocaleString("vi-VN")}đ`;
}

function availabilityBadge(available: number | undefined): { text: string; cls: string } {
  const n = Number(available ?? 0);
  if (n <= 0) return { text: "Hết hàng", cls: "bg-red-100 text-red-700" };
  if (n <= 5) return { text: "Sắp hết", cls: "bg-amber-100 text-amber-800" };
  return { text: "Còn hàng", cls: "bg-emerald-100 text-emerald-700" };
}

interface VariantListProps {
  items: ProductVariant[];
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (variant: ProductVariant) => void;
  onDelete: (variant: ProductVariant) => void;
  onInbound: (variant: ProductVariant) => void;
}

export default function VariantList({ items, loading, error, onRetry, onCreate, onEdit, onDelete, onInbound }: VariantListProps) {
  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">Đang tải biến thể...</p>;
  }
  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <p className="text-sm text-slate-600">Chưa có biến thể nào.</p>
        <Button type="button" className="mt-3 bg-[#2bb6a3]" onClick={onCreate}>
          Thêm biến thể
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Ảnh</th>
            <th className="px-4 py-3">Giá</th>
            <th className="px-4 py-3">Thuộc tính</th>
            <th className="px-4 py-3">Available</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((v, idx) => {
            const id = String(v._id ?? v.id ?? idx);
            const firstImage = Array.isArray(v.images) ? v.images.find((x) => typeof x === "string" && x.trim()) : "";
            const badge = availabilityBadge(v.available_quantity);
            return (
              <tr key={id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono text-xs">{String(v.sku ?? "—")}</td>
                <td className="px-4 py-3">
                  {firstImage ? <img src={firstImage} alt={String(v.sku ?? "variant")} className="h-10 w-10 rounded border border-slate-200 object-cover" /> : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatVnd(v.price)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <div className="space-y-0.5">
                    <p>color: {String(v.color ?? "—")}</p>
                    <p>size: {String(v.size ?? "—")}</p>
                    <p>bridge_fit: {String(v.bridge_fit ?? "—")}</p>
                    <p>diameter: {String(v.diameter ?? "—")}</p>
                    <p>base_curve: {String(v.base_curve ?? "—")}</p>
                    <p>power: {String(v.power ?? "—")}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                    {Number(v.available_quantity ?? 0)} · {badge.text}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button type="button" variant="ghost" className="text-indigo-600" onClick={() => onInbound(v)}>
                      Nhập hàng
                    </Button>
                    <Button type="button" variant="ghost" className="text-[#2bb6a3]" onClick={() => onEdit(v)}>
                      Sửa
                    </Button>
                    <Button type="button" variant="ghost" className="text-red-600" onClick={() => onDelete(v)}>
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

