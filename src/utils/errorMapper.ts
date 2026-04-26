import { isAxiosError } from "axios";

export interface VariantMappedError {
  message: string;
  fieldErrors?: Partial<Record<"sku" | "price" | "images", string>>;
}

export function mapVariantApiError(error: unknown): VariantMappedError {
  if (!isAxiosError(error)) {
    return { message: "Đã có lỗi xảy ra. Vui lòng thử lại." };
  }
  const status = error.response?.status;
  const data = (error.response?.data ?? {}) as Record<string, unknown>;
  const msg = String(data.message ?? error.message ?? "").trim();
  const lower = msg.toLowerCase();

  if (status === 401) {
    return { message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }
  if (status === 403) {
    return { message: "Bạn không có quyền thực hiện thao tác này" };
  }
  if (status === 404) {
    return { message: "Biến thể hoặc sản phẩm không tồn tại" };
  }
  if (status === 409 || lower.includes("sku") && lower.includes("tồn tại")) {
    return { message: "SKU biến thể đã tồn tại", fieldErrors: { sku: "SKU biến thể đã tồn tại" } };
  }
  if (status === 400 && (lower.includes("stock_quantity") || lower.includes("reserved_quantity") || lower.includes("phiếu nhập kho"))) {
    return { message: "Không thể chỉnh tồn kho trực tiếp. Vui lòng dùng phiếu nhập kho." };
  }
  if (msg) {
    return { message: msg };
  }
  return { message: "Đã có lỗi xảy ra. Vui lòng thử lại." };
}

