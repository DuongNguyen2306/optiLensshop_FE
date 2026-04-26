import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createProductMultipart, fetchBrands, fetchCategories, fetchModels } from "@/features/catalog/api";
import type { ProductType } from "@/features/catalog/types";
import { entityId } from "@/features/catalog/types";
import { parseApiError } from "@/utils/parseApiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400";

/** BE không có GET /materials — danh gợi ý + nhập tay khi chọn "Khác". */
const MATERIAL_PRESETS = [
  { value: "", label: "— Không chọn —" },
  { value: "Nhựa Acetate", label: "Nhựa Acetate" },
  { value: "TR90", label: "TR90" },
  { value: "Kim loại", label: "Kim loại" },
  { value: "Titanium", label: "Titanium" },
  { value: "Titanium beta", label: "Titanium beta" },
  { value: "Polycarbonate (PC)", label: "Polycarbonate (PC)" },
  { value: "Ultem", label: "Ultem" },
  { value: "__other__", label: "Khác (nhập tay)…" },
] as const;

const productCreateKeys = {
  categories: ["catalog", "categories", "product-create"] as const,
  brands: ["catalog", "brands", "product-create"] as const,
  models: ["catalog", "models", "product-create"] as const,
};

interface VariantRow {
  id: string;
  sku: string;
  price: string;
  color: string;
  size: string;
  bridge_fit: string;
  diameter: string;
  base_curve: string;
  power: string;
}

function newRow(): VariantRow {
  return {
    id: crypto.randomUUID(),
    sku: "",
    price: "",
    color: "",
    size: "",
    bridge_fit: "",
    diameter: "",
    base_curve: "",
    power: "",
  };
}

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductType | "">("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [materialPreset, setMaterialPreset] = useState("");
  const [materialOther, setMaterialOther] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([newRow()]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const categoriesQuery = useQuery({
    queryKey: productCreateKeys.categories,
    queryFn: fetchCategories,
  });
  const brandsQuery = useQuery({
    queryKey: productCreateKeys.brands,
    queryFn: fetchBrands,
  });
  const modelsQuery = useQuery({
    queryKey: productCreateKeys.models,
    queryFn: fetchModels,
  });

  const categories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [categoriesQuery.data]
  );
  const brands = useMemo(
    () => [...(brandsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [brandsQuery.data]
  );
  const modelsFiltered = useMemo(() => {
    const list = [...(modelsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (!type) {
      return list;
    }
    if (type === "accessory") {
      return list;
    }
    return list.filter((m) => m.type === type);
  }, [modelsQuery.data, type]);

  useEffect(() => {
    if (!modelId) {
      return;
    }
    const m = (modelsQuery.data ?? []).find((x) => entityId(x) === modelId);
    if (!m) {
      return;
    }
    if (type && type !== "accessory" && m.type !== type) {
      setModelId("");
    }
  }, [type, modelId, modelsQuery.data]);

  const addRow = () => setRows((r) => [...r, newRow()]);
  const removeRow = (id: string) => setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  const updateRow = (id: string, patch: Partial<VariantRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const materialForSubmit = (): string | undefined => {
    if (materialPreset === "__other__") {
      const t = materialOther.trim();
      return t || undefined;
    }
    return materialPreset.trim() || undefined;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId.trim() || !name.trim()) {
      toast.error("Vui lòng chọn danh mục và nhập tên sản phẩm.");
      return;
    }
    if (imageFiles.length === 0) {
      toast.error("Cần ít nhất một file ảnh (field images trong multipart).");
      return;
    }

    const skusFilled = rows.map((r) => r.sku.trim()).filter(Boolean);
    const skuLower = skusFilled.map((s) => s.toLowerCase());
    if (skuLower.length !== new Set(skuLower).size) {
      toast.error("SKU biến thể không được trùng nhau trong cùng một sản phẩm.");
      return;
    }

    try {
      setSubmitting(true);
      const variantsPayload = rows.map((row, idx) => {
        const price = Number(row.price);
        if (Number.isNaN(price) || row.price.trim() === "") {
          throw new Error(`Biến thể #${idx + 1}: price bắt buộc và phải là số.`);
        }
        if (price <= 0) {
          throw new Error(`Biến thể #${idx + 1}: price phải lớn hơn 0 (theo validate BE).`);
        }
        const item: Record<string, unknown> = {
          price,
          color: row.color.trim() || undefined,
          size: row.size.trim() || undefined,
          bridge_fit: row.bridge_fit.trim() || undefined,
          diameter: row.diameter.trim() || undefined,
          base_curve: row.base_curve.trim() || undefined,
          power: row.power.trim() || undefined,
        };
        const sku = row.sku.trim();
        if (sku) {
          item.sku = sku;
        }
        return item;
      });
      await createProductMultipart({
        category: categoryId.trim(),
        name: name.trim(),
        variants: JSON.stringify(variantsPayload),
        images: imageFiles,
        type: type || undefined,
        brand: brandId.trim() || undefined,
        model: modelId.trim() || undefined,
        material: materialForSubmit(),
        description: description.trim() || undefined,
      });
      toast.success("Tạo sản phẩm thành công.");
      navigate("/admin/catalog/products", { replace: true });
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(parseApiError(err));
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(parseApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) {
      return;
    }
    setImageFiles(Array.from(files));
  };

  const loadingLists = categoriesQuery.isPending || brandsQuery.isPending || modelsQuery.isPending;
  const listError =
    categoriesQuery.isError || brandsQuery.isError || modelsQuery.isError
      ? parseApiError(
          categoriesQuery.error ?? brandsQuery.error ?? modelsQuery.error,
          "Không tải được danh mục / thương hiệu / model."
        )
      : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/catalog/products" className="text-sm text-teal-600 hover:underline">
          ← Danh sách
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tạo sản phẩm</h1>
      </div>

      {listError ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{listError}</p>
      ) : null}

      <form onSubmit={onSubmit} className="max-w-4xl space-y-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Danh mục *</Label>
            <select
              className={selectClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              disabled={loadingLists || categories.length === 0}
            >
              <option value="">{loadingLists ? "Đang tải…" : "— Chọn danh mục —"}</option>
              {categories.map((c) => {
                const id = entityId(c);
                if (!id) {
                  return null;
                }
                return (
                  <option key={id} value={id}>
                    {c.name} ({c.slug})
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500">Lấy từ GET /categories</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Tên sản phẩm *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Gọng kính …" />
          </div>
          <div className="space-y-1">
            <Label>Loại (type)</Label>
            <select
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as ProductType | "")}
            >
              <option value="">—</option>
              <option value="frame">frame</option>
              <option value="lens">lens</option>
              <option value="accessory">accessory</option>
            </select>
            <p className="text-xs text-slate-500">Gợi ý lọc model (frame / lens).</p>
          </div>
          <div className="space-y-1">
            <Label>Thương hiệu (brand)</Label>
            <select
              className={selectClass}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={loadingLists || brands.length === 0}
            >
              <option value="">— Không chọn —</option>
              {brands.map((b) => {
                const id = entityId(b);
                if (!id) {
                  return null;
                }
                return (
                  <option key={id} value={id}>
                    {b.name}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500">GET /brands</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Model mẫu mã</Label>
            <select
              className={selectClass}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={loadingLists || modelsFiltered.length === 0}
            >
              <option value="">
                {loadingLists ? "Đang tải…" : modelsFiltered.length === 0 ? "Chưa có model phù hợp" : "— Không chọn —"}
              </option>
              {modelsFiltered.map((m) => {
                const id = entityId(m);
                if (!id) {
                  return null;
                }
                return (
                  <option key={id} value={id}>
                    {m.name} ({m.type})
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500">GET /models — lọc theo type khi đã chọn frame/lens.</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Chất liệu (material)</Label>
            <select
              className={selectClass}
              value={materialPreset}
              onChange={(e) => {
                setMaterialPreset(e.target.value);
                if (e.target.value !== "__other__") {
                  setMaterialOther("");
                }
              }}
            >
              {MATERIAL_PRESETS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {materialPreset === "__other__" ? (
              <div className="mt-2 space-y-1">
                <Label className="text-xs text-slate-600">Nhập chất liệu</Label>
                <Input
                  value={materialOther}
                  onChange={(e) => setMaterialOther(e.target.value)}
                  placeholder="VD: Carbon fiber, gỗ…"
                />
              </div>
            ) : null}
            <p className="text-xs text-slate-500">Chưa có API materials — chọn gợi ý hoặc Khác.</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Mô tả</Label>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ảnh sản phẩm (images[]) *</Label>
          <input type="file" accept="image/*" multiple required className="text-sm" onChange={onFiles} />
          <p className="text-xs text-slate-500">Bắt buộc theo Swagger. Đã chọn: {imageFiles.length} file</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Biến thể (variants — JSON string) *</Label>
            <Button type="button" variant="outline" onClick={addRow}>
              + Thêm dòng
            </Button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Gửi <code className="rounded bg-slate-100 px-1">formData.append(&quot;variants&quot;, JSON.stringify([...]))</code>.
            Mỗi phần tử: <strong>price</strong> bắt buộc (&gt; 0), dùng trực tiếp field{" "}
            <strong>color/size/bridge_fit/diameter/base_curve/power</strong>.{" "}
            <strong>sku</strong> tùy chọn — để trống BE tự sinh; nếu nhập thì không trùng giữa các dòng. Không gửi{" "}
            <code className="rounded bg-slate-100 px-1">sku</code> cấp product; slug product BE sinh từ <code className="rounded bg-slate-100 px-1">name</code>.
          </p>
          <div className="space-y-4">
            {rows.map((row, idx) => (
              <div key={row.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Biến thể #{idx + 1}</span>
                  <Button type="button" variant="ghost" className="text-red-600" onClick={() => removeRow(row.id)}>
                    Xóa dòng
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>sku (tùy chọn)</Label>
                    <Input
                      value={row.sku}
                      onChange={(e) => updateRow(row.id, { sku: e.target.value })}
                      placeholder="Để trống → BE tự sinh SKU variant"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>price * (VNĐ, &gt; 0)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={row.price}
                      onChange={(e) => updateRow(row.id, { price: e.target.value })}
                      placeholder="VD: 890000"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>color</Label>
                    <Input value={row.color} onChange={(e) => updateRow(row.id, { color: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>size</Label>
                    <Input value={row.size} onChange={(e) => updateRow(row.id, { size: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>bridge_fit</Label>
                    <Input value={row.bridge_fit} onChange={(e) => updateRow(row.id, { bridge_fit: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>diameter</Label>
                    <Input value={row.diameter} onChange={(e) => updateRow(row.id, { diameter: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>base_curve</Label>
                    <Input value={row.base_curve} onChange={(e) => updateRow(row.id, { base_curve: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>power</Label>
                    <Input
                      value={row.power}
                      onChange={(e) => updateRow(row.id, { power: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={submitting || loadingLists || categories.length === 0 || imageFiles.length === 0}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {submitting ? "Đang gửi…" : "Tạo sản phẩm"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Hủy
          </Button>
        </div>
      </form>
    </div>
  );
}
