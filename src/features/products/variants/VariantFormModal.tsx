import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ManagementModal from "@/components/admin/ManagementModal";
import type { ProductVariant, VariantFormSubmitPayload } from "@/types/product";

interface VariantFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  loading?: boolean;
  initial?: ProductVariant | null;
  fieldErrorSku?: string;
  onClose: () => void;
  onSubmit: (payload: VariantFormSubmitPayload) => void;
}

function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return Boolean(u.protocol && u.host);
  } catch {
    return false;
  }
}

export default function VariantFormModal({
  open,
  mode,
  loading,
  initial,
  fieldErrorSku,
  onClose,
  onSubmit,
}: VariantFormModalProps) {
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<Array<{ key: string; url: string }>>([]);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [bridgeFit, setBridgeFit] = useState("");
  const [diameter, setDiameter] = useState("");
  const [baseCurve, setBaseCurve] = useState("");
  const [power, setPower] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSku(String(initial?.sku ?? ""));
    setPrice(initial?.price != null ? String(initial.price) : "");
    setExistingImages(Array.isArray(initial?.images) ? initial.images.filter(Boolean) : []);
    setNewFiles([]);
    setNewFilePreviews([]);
    setColor(String(initial?.color ?? ""));
    setSize(String(initial?.size ?? ""));
    setBridgeFit(String(initial?.bridge_fit ?? ""));
    setDiameter(String(initial?.diameter ?? ""));
    setBaseCurve(String(initial?.base_curve ?? ""));
    setPower(String(initial?.power ?? ""));
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    const next = newFiles.map((file, idx) => ({
      key: `${file.name}_${file.size}_${idx}`,
      url: URL.createObjectURL(file),
    }));
    setNewFilePreviews(next);
    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [newFiles]);

  const firstExistingImage = useMemo(() => existingImages[0] ?? "", [existingImages]);

  const submit = () => {
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      setError("Giá phải là số và lớn hơn 0.");
      return;
    }
    if (existingImages.some((item) => !isValidUrl(item))) {
      setError("Ảnh URL cũ chứa URL không hợp lệ.");
      return;
    }
    setError(null);
    onSubmit({
      values: {
        sku: sku.trim() || undefined,
        price: numPrice,
        color: color.trim() || undefined,
        size: size.trim() || undefined,
        bridge_fit: bridgeFit.trim() || undefined,
        diameter: diameter.trim() || undefined,
        base_curve: baseCurve.trim() || undefined,
        power: power.trim() || undefined,
      },
      existingImageUrls: existingImages,
      newImageFiles: newFiles,
    });
  };

  return (
    <ManagementModal
      open={open}
      title={mode === "create" ? "Thêm biến thể" : "Sửa biến thể"}
      description={mode === "create" ? "Nhập thông tin variant mới" : String(initial?._id ?? initial?.id ?? "")}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="button" className="bg-[#2bb6a3]" onClick={submit} disabled={loading}>
            {loading ? "Đang lưu..." : mode === "create" ? "Tạo biến thể" : "Lưu thay đổi"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
            {fieldErrorSku ? <p className="text-xs text-red-600">{fieldErrorSku}</p> : null}
          </div>
          <div className="space-y-1">
            <Label>Giá *</Label>
            <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Ảnh biến thể</Label>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length) {
                  setNewFiles((prev) => [...prev, ...files]);
                }
                e.target.value = "";
              }}
            />

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Ảnh URL hiện có</p>
              {existingImages.length === 0 ? (
                <p className="text-xs text-slate-400">Không có ảnh URL cũ.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((url) => (
                    <div key={url} className="relative h-14 w-14">
                      <img src={url} alt="existing" className="h-full w-full rounded border border-slate-200 object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] text-white"
                        onClick={() => setExistingImages((prev) => prev.filter((x) => x !== url))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Ảnh file mới</p>
              {newFilePreviews.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa chọn file mới.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {newFilePreviews.map((preview, idx) => (
                    <div key={preview.key} className="relative h-14 w-14">
                      <img src={preview.url} alt="new file" className="h-full w-full rounded border border-[#2bb6a3]/40 object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] text-white"
                        onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {firstExistingImage ? <p className="text-[11px] text-slate-500">Ảnh đại diện hiện tại: {firstExistingImage}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>color</Label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>size</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>bridge_fit</Label>
            <Input value={bridgeFit} onChange={(e) => setBridgeFit(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>diameter</Label>
            <Input value={diameter} onChange={(e) => setDiameter(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>base_curve</Label>
            <Input value={baseCurve} onChange={(e) => setBaseCurve(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>power</Label>
            <Input value={power} onChange={(e) => setPower(e.target.value)} />
          </div>
        </div>

        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Tồn kho được quản lý qua phiếu nhập kho, không chỉnh trực tiếp tại biến thể.
        </p>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </ManagementModal>
  );
}

