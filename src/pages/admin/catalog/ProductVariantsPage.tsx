import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { createProductVariant, fetchProductVariants } from "@/features/catalog/api";
import type { ProductVariantInput } from "@/features/catalog/types";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductVariantsPage() {
  const { productId } = useParams<{ productId: string }>();
  const [list, setList] = useState<(ProductVariantInput & { _id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [attributesJson, setAttributesJson] = useState("{}");

  const load = useCallback(async () => {
    if (!productId) {
      return;
    }
    setLoading(true);
    try {
      const items = await fetchProductVariants(productId);
      setList(items);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được biến thể."));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      return;
    }
    let attributes: Record<string, unknown> = {};
    try {
      attributes = attributesJson.trim() ? (JSON.parse(attributesJson) as Record<string, unknown>) : {};
    } catch {
      toast.error("attributes phải là JSON hợp lệ.");
      return;
    }
    const p = Number(price);
    if (Number.isNaN(p)) {
      toast.error("price bắt buộc và phải là số.");
      return;
    }
    setSaving(true);
    try {
      await createProductVariant(productId, {
        sku: sku.trim() || undefined,
        attributes,
        price: p,
        stock_quantity: Number(stock) || 0,
        images: [],
      });
      toast.success("Đã thêm biến thể.");
      setSku("");
      setPrice("0");
      setStock("0");
      setAttributesJson("{}");
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!productId) {
    return <p>Thiếu productId.</p>;
  }

  return (
    <div>
      <Link to="/admin/catalog/products" className="text-sm text-teal-600 hover:underline">
        ← Sản phẩm
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Biến thể sản phẩm</h1>
      <p className="text-sm text-slate-500">Product ID: {productId}</p>

      {loading ? (
        <p className="mt-4 text-slate-500">Đang tải…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Giá</th>
                <th className="px-4 py-2">Tồn</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v, i) => (
                <tr key={v._id ?? i} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{String(v.sku ?? "—")}</td>
                  <td className="px-4 py-2">{String(v.price ?? "")}</td>
                  <td className="px-4 py-2">{String(v.stock_quantity ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 ? <p className="p-4 text-slate-500">Chưa có biến thể.</p> : null}
        </div>
      )}

      <form onSubmit={onAdd} className="mt-8 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Thêm biến thể (POST JSON)</h2>
        <div className="space-y-1">
          <Label>sku</Label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>price *</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>stock_quantity</Label>
          <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>attributes (JSON)</Label>
          <Input className="font-mono text-xs" value={attributesJson} onChange={(e) => setAttributesJson(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving} className="bg-teal-600">
          {saving ? "Đang lưu…" : "Thêm biến thể"}
        </Button>
      </form>
    </div>
  );
}
