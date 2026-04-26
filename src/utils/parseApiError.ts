import { isAxiosError } from "axios";
import { getApiErrorMessage } from "@/lib/api-error";

export function parseApiError(error: unknown, fallback = "Đã có lỗi xảy ra."): string {
  const msg = getApiErrorMessage(error, fallback);
  const lower = msg.toLowerCase();
  if (lower.includes("stock_quantity") || lower.includes("reserved_quantity") || lower.includes("tồn kho")) {
    return "Tồn kho được quản lý qua phiếu nhập kho.";
  }
  if (lower.includes("phiếu nhập kho")) {
    return "Tồn kho được quản lý qua phiếu nhập kho.";
  }
  if (isAxiosError(error) && error.response?.status === 403) {
    return "Bạn không đủ quyền thực hiện thao tác này.";
  }
  return msg;
}

