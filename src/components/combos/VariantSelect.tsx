import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { fetchVariants } from "@/services/variants.service";
import type { Variant, VariantType } from "@/types/variant";

function variantId(v: Variant): string {
  return String(v._id ?? v.id ?? "");
}

function productName(v: Variant): string {
  const p = (v.product ?? v.product_id) as Record<string, unknown> | undefined;
  const name = p?.name;
  return typeof name === "string" && name.trim() ? name.trim() : "—";
}

function formatMoney(n: unknown): string {
  const v = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(v)) {
    return "—";
  }
  return `${Math.round(v).toLocaleString("vi-VN")}đ`;
}

function stockLabel(v: Variant): string {
  const qty = typeof v.stock_quantity === "number" ? v.stock_quantity : undefined;
  const st = typeof v.stock_type === "string" ? v.stock_type : "";
  const base = qty != null ? `Tồn: ${qty}` : "Tồn: —";
  return st ? `${base} · ${st}` : base;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function VariantSelect({
  type,
  label,
  value,
  onChange,
}: {
  type: VariantType;
  label: string;
  value: Variant | null;
  onChange: (variant: Variant | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const debounced = useDebouncedValue(keyword, 400);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const query = useQuery({
    queryKey: ["variants", type, debounced],
    queryFn: () => fetchVariants({ type, search: debounced || undefined, limit: 20 }),
  });

  const items = query.data?.items ?? [];

  const selectedId = value ? variantId(value) : "";
  const selectedLabel = value ? `${value.sku ?? "—"} · ${productName(value)} · ${formatMoney(value.price)}` : "";

  const placeholder = useMemo(() => {
    return type === "frame" ? "Tìm SKU/tên gọng..." : "Tìm SKU/tên tròng...";
  }, [type]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={open ? keyword : selectedLabel}
          onFocus={() => {
            setOpen(true);
            setKeyword("");
          }}
          onChange={(e) => {
            setOpen(true);
            setKeyword(e.target.value);
          }}
          placeholder={value ? selectedLabel : placeholder}
        />

        {value ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => onChange(null)}
            title="Bỏ chọn"
          >
            X
          </button>
        ) : null}

        {open ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="max-h-72 overflow-auto">
              {query.isPending ? (
                <div className="p-3 text-sm text-slate-600">Đang tải biến thể…</div>
              ) : query.isError ? (
                <div className="p-3">
                  <p className="text-sm text-red-600">{getApiErrorMessage(query.error, "Không tải được biến thể.")}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>
                    Thử lại
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">Không tìm thấy biến thể.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((v) => {
                    const id = variantId(v);
                    const active = id && id === selectedId;
                    return (
                      <li key={id || Math.random()}>
                        <button
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            active ? "bg-[#2bb6a3]/10" : ""
                          }`}
                          onClick={() => {
                            onChange(v);
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {v.sku ?? "—"} <span className="font-normal text-slate-500">· {productName(v)}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{stockLabel(v)}</p>
                            </div>
                            <p className="shrink-0 font-semibold text-slate-900">{formatMoney(v.price)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

