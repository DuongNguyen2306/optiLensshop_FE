/**
 * Một số BE trả `{ success, data: { order, payUrl, message } }` — gộp để đọc order/payUrl/message.
 */
export function unwrapCheckoutResponseRoot(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    return {};
  }
  const root = data as Record<string, unknown>;
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return { ...(inner as Record<string, unknown>), ...root };
  }
  return root;
}

/**
 * BE có thể trả link MoMo ở nhiều key / lồng trong `data`, `payment`, …
 * FE cần tìm được chuỗi https… để redirect user.
 */
export function extractPayUrlFromCheckoutResponse(data: unknown): string | undefined {
  const seen = new WeakSet<object>();

  const walk = (node: unknown): string | undefined => {
    if (!node || typeof node !== "object") {
      return undefined;
    }
    if (seen.has(node as object)) {
      return undefined;
    }
    seen.add(node as object);
    const o = node as Record<string, unknown>;
    const keys = [
      "payUrl",
      "payURL",
      "payurl",
      "paymentUrl",
      "payment_url",
      "momoPayUrl",
      "momo_pay_url",
      "deeplink",
      "deeplinkWeb",
      "deeplinkweb",
      "redirectUrl",
      "redirect_url",
    ];
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string") {
        const t = v.trim();
        if (/^https?:\/\//i.test(t)) {
          return t;
        }
      }
    }
    for (const k of ["data", "payment", "result", "checkout", "momo"]) {
      const child = o[k];
      const found = walk(child);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  return walk(data);
}
