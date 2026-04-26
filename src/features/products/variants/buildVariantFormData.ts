import type { VariantFormValues } from "@/types/product";

interface BuildVariantFormDataInput {
  values: VariantFormValues;
  existingImageUrls: string[];
  newImageFiles: File[];
}

function appendIfValue(fd: FormData, key: string, value: unknown) {
  if (value == null) return;
  const s = String(value).trim();
  if (!s) return;
  fd.append(key, s);
}

export function buildVariantFormData(input: BuildVariantFormDataInput): FormData {
  const fd = new FormData();
  const { values, existingImageUrls, newImageFiles } = input;

  appendIfValue(fd, "sku", values.sku);
  fd.append("price", String(Number(values.price)));
  appendIfValue(fd, "color", values.color);
  appendIfValue(fd, "size", values.size);
  appendIfValue(fd, "bridge_fit", values.bridge_fit);
  appendIfValue(fd, "diameter", values.diameter);
  appendIfValue(fd, "base_curve", values.base_curve);
  appendIfValue(fd, "power", values.power);

  const normalizedExisting = existingImageUrls.map((x) => x.trim()).filter(Boolean);
  if (normalizedExisting.length > 0) {
    fd.append("images", JSON.stringify(normalizedExisting));
  }
  newImageFiles.forEach((file) => fd.append("images", file));
  return fd;
}

