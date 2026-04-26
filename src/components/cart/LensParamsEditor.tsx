import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LensParams } from "@/types/shop";

const NUMERIC_FIELDS: (keyof LensParams)[] = [
  "sph_right",
  "sph_left",
  "cyl_right",
  "cyl_left",
  "axis_right",
  "axis_left",
  "add_right",
  "add_left",
  "pd",
  "pupillary_distance",
];

function toStringValue(v: unknown): string {
  if (v == null) {
    return "";
  }
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  return "";
}

export default function LensParamsEditor({
  initialValue,
  submitting,
  onSubmit,
}: {
  initialValue?: LensParams;
  submitting?: boolean;
  onSubmit: (value: LensParams | null) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const k of NUMERIC_FIELDS) {
      next[k] = toStringValue(initialValue?.[k]);
    }
    next.note = toStringValue(initialValue?.note);
    setForm(next);
  }, [initialValue]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Lens params</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field} className="space-y-1">
            <Label className="text-xs">{field}</Label>
            <Input
              value={form[field] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              placeholder="Để trống nếu không dùng"
              className="h-9 text-sm"
            />
          </div>
        ))}
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label className="text-xs">note</Label>
          <Input
            value={form.note ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Ghi chú"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          className="bg-[#2bb6a3]"
          onClick={() => {
            const payload: LensParams = {};
            let hasAnyMeaningfulValue = false;
            for (const key of NUMERIC_FIELDS) {
              const raw = (form[key] ?? "").trim();
              if (!raw) {
                continue;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) {
                setError(`Giá trị ${key} không hợp lệ.`);
                return;
              }
              payload[key] = n;
              if (n !== 0) {
                hasAnyMeaningfulValue = true;
              }
            }
            const note = (form.note ?? "").trim();
            if (note) {
              payload.note = note;
              if (note.toLowerCase() !== "không có ghi chú") {
                hasAnyMeaningfulValue = true;
              }
            }
            setError(null);
            onSubmit(hasAnyMeaningfulValue ? payload : null);
          }}
        >
          {submitting ? "Đang lưu…" : "Lưu lens params"}
        </Button>
      </div>
    </div>
  );
}
