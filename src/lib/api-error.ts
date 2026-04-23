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
    const normalizedError = typeof data.error === "string" && data.error.trim() ? data.error.trim() : null;
    const normalizedMsg = typeof data.msg === "string" && data.msg.trim() ? data.msg.trim() : null;
    const fromMessage = normalizeMessage(data.message);
    const isGenericServerMessage = fromMessage != null && /^(lỗi server|internal server error)$/i.test(fromMessage);
    if (normalizedError && isGenericServerMessage) {
      return normalizedError;
    }
    if (fromMessage) {
      return fromMessage;
    }
    if (normalizedError) {
      return normalizedError;
    }
    if (normalizedMsg) {
      return normalizedMsg;
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}
