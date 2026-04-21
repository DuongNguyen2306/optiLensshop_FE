import { AxiosError } from "axios";

function normalizeMessage(message: unknown): string | null {
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === "string" && m.trim()).map((m) => m.trim());
    if (parts.length) {
      return parts.join("; ");
    }
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra.") {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as { message?: unknown; error?: string; msg?: string };
    const fromMessage = normalizeMessage(data.message);
    if (fromMessage) {
      return fromMessage;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.msg === "string" && data.msg.trim()) {
      return data.msg.trim();
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}
