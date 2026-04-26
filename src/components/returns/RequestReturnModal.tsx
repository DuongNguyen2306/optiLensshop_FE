import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { createReturnRequest } from "@/services/returns.service";
import type { OrderLineItem } from "@/types/order";
import type { ReasonCategory } from "@/types/returns";

const REASON_CATEGORIES: { value: ReasonCategory; label: string }[] = [
  { value: "damaged_on_arrival", label: "Hàng hỏng khi nhận" },
  { value: "wrong_item", label: "Sai sản phẩm" },
  { value: "changed_mind", label: "Đổi ý" },
  { value: "defective", label: "Sản phẩm lỗi" },
  { value: "other", label: "Lý do khác" },
];

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function firstImage(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const arr = obj[k];
    if (Array.isArray(arr)) {
      const img = arr.find((x): x is string => typeof x === "string" && Boolean(x.trim()));
      if (img) return img;
    }
    if (typeof arr === "string" && arr.trim()) return arr.trim();
  }
  return "";
}

function getItemName(item: OrderLineItem): string {
  // Tên trực tiếp trên item
  const direct = pickStr(item as Record<string, unknown>, "name", "product_name", "variant_name", "title");
  if (direct) return direct;

  // variant_id đã populate
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    const prod = v.product_id;
    if (prod && typeof prod === "object") {
      const pName = pickStr(prod as Record<string, unknown>, "name", "title");
      if (pName) return pName;
    }
    const vName = pickStr(v, "name", "title");
    if (vName) return vName;
    const sku = pickStr(v, "sku");
    if (sku) return `SKU: ${sku}`;
  }

  // combo_id đã populate
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    const cName = pickStr(c, "name", "title");
    if (cName) return cName;
  }

  const itemType = pickStr(item as Record<string, unknown>, "item_type");
  if (itemType === "lens") return "Tròng kính";
  if (itemType === "frame") return "Gọng kính";
  if (itemType === "combo") return "Combo kính";
  return "Sản phẩm";
}

function getItemImage(item: OrderLineItem): string {
  // Ảnh trực tiếp trên item
  const direct = firstImage(item as Record<string, unknown>, "image", "images", "thumbnail");
  if (direct) return direct;

  // variant_id đã populate
  if (item.variant_id && typeof item.variant_id === "object") {
    const v = item.variant_id as Record<string, unknown>;
    const vImg = firstImage(v, "images", "image", "thumbnail");
    if (vImg) return vImg;
    // ảnh từ product_id
    const prod = v.product_id;
    if (prod && typeof prod === "object") {
      const pImg = firstImage(prod as Record<string, unknown>, "images", "image", "thumbnail");
      if (pImg) return pImg;
    }
  }

  // combo_id đã populate
  if (item.combo_id && typeof item.combo_id === "object") {
    const c = item.combo_id as Record<string, unknown>;
    const cImg = firstImage(c, "images", "image", "preview_image", "thumbnail");
    if (cImg) return cImg;
  }

  return "";
}

interface Props {
  orderId: string;
  items: OrderLineItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestReturnModal({ orderId, items, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>(() => {
    const init: Record<string, { checked: boolean; qty: number }> = {};
    for (const item of items) {
      const key = String(item._id ?? item.id ?? "");
      if (key) init[key] = { checked: false, qty: Number(item.quantity ?? 1) };
    }
    return init;
  });
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory>("damaged_on_arrival");
  const [returnReason, setReturnReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const MAX_REASON_LENGTH = 500;
  const MIN_REASON_LENGTH = 1;

  const mutation = useMutation({
    mutationFn: () => {
      const selectedItems = Object.entries(selected)
        .filter(([, v]) => v.checked)
        .map(([order_item_id, v]) => ({ order_item_id, quantity: v.qty }));
      return createReturnRequest({
        order_id: orderId,
        return_reason: returnReason.trim(),
        reason_category: reasonCategory,
        items: selectedItems,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã gửi yêu cầu trả hàng. Shop sẽ liên hệ sớm.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể gửi yêu cầu trả hàng.")),
  });

  const checkedCount = Object.values(selected).filter((v) => v.checked).length;

  function handleNext() {
    if (checkedCount === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm muốn trả.");
      return;
    }
    setStep(2);
  }

  function handleSubmit() {
    const trimmed = returnReason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setReasonError(`Mô tả lý do phải ít nhất ${MIN_REASON_LENGTH} ký tự.`);
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setReasonError(`Mô tả lý do không được vượt quá ${MAX_REASON_LENGTH} ký tự.`);
      return;
    }
    setReasonError("");
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Yêu cầu trả hàng</h2>
            <p className="text-xs text-slate-500">Bước {step} / 2</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Chọn sản phẩm muốn trả:</p>
              {items.map((item) => {
                const key = String(item._id ?? item.id ?? "");
                if (!key) return null;
                const state = selected[key];
                const maxQty = Number(item.quantity ?? 1);
                const img = getItemImage(item);
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      state?.checked ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-teal-600"
                      checked={state?.checked ?? false}
                      onChange={(e) =>
                        setSelected((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], checked: e.target.checked },
                        }))
                      }
                    />
                    {img ? (
                      <img src={img} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{getItemName(item)}</p>
                      <p className="text-xs text-slate-500">Đã mua: {maxQty}</p>
                      {state?.checked ? (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-slate-600">Số lượng trả:</label>
                          <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={state.qty}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  qty: Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)),
                                },
                              }))
                            }
                            className="h-7 w-16 rounded-md border border-slate-300 px-2 text-center text-sm outline-none focus:border-teal-400"
                          />
                        </div>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Loại lý do</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as ReasonCategory)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-400"
                >
                  {REASON_CATEGORIES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= MAX_REASON_LENGTH) setReturnReason(val);
                    if (reasonError) setReasonError("");
                  }}
                  placeholder={`Mô tả rõ tình trạng sản phẩm, vấn đề gặp phải… (tối đa ${MAX_REASON_LENGTH} ký tự)`}
                  rows={4}
                  maxLength={MAX_REASON_LENGTH}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    reasonError
                      ? "border-red-400 bg-red-50 focus:border-red-500"
                      : "border-slate-300 focus:border-teal-400"
                  }`}
                />
                <div className="flex items-center justify-between">
                  {reasonError ? (
                    <p className="text-xs text-red-600">{reasonError}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Bắt buộc nhập</p>
                  )}
                  <p className={`text-xs ${returnReason.length >= MAX_REASON_LENGTH ? "font-semibold text-red-500" : returnReason.length >= MAX_REASON_LENGTH * 0.9 ? "text-orange-500" : "text-slate-400"}`}>
                    {returnReason.length} / {MAX_REASON_LENGTH}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? onClose : () => setStep(1)}
          >
            {step === 1 ? "Hủy" : "← Quay lại"}
          </Button>
          {step === 1 ? (
            <Button type="button" className="bg-[#2bb6a3]" onClick={handleNext}>
              Tiếp theo →
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={mutation.isPending}
              onClick={handleSubmit}
            >
              {mutation.isPending ? "Đang gửi…" : "Gửi yêu cầu trả hàng"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
