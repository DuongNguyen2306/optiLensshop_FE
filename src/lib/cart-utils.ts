/** Parse số dòng trong giỏ từ response BE (shape có thể khác nhau). */
export function cartItemCountFromResponse(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0;
  }
  const o = data as Record<string, unknown>;
  const len = (x: unknown) => (Array.isArray(x) ? x.length : 0);
  const n =
    len(o.items) ||
    len(o.cart_items) ||
    len(o.line_items) ||
    (typeof o.item_count === "number" ? o.item_count : 0) ||
    (typeof o.total_items === "number" ? o.total_items : 0);
  return typeof n === "number" && n >= 0 ? n : 0;
}

export function cartItemsArrayFromResponse(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) {
    return o.items;
  }
  if (Array.isArray(o.cart_items)) {
    return o.cart_items;
  }
  if (Array.isArray(o.line_items)) {
    return o.line_items;
  }
  return [];
}
