import axios from "@/lib/axios";
import type { AddCartItemBody } from "@/types/shop";

export async function postCartItem(body: AddCartItemBody) {
  const payload: Record<string, unknown> = {
    quantity: body.quantity,
    lens_params: body.lens_params ?? {},
  };
  if (body.combo_id) {
    payload.combo_id = body.combo_id;
  } else if (body.variant_id) {
    payload.variant_id = body.variant_id;
  }
  const { data } = await axios.post<unknown>("/cart/items", payload);
  return data;
}

export async function getCart() {
  const { data } = await axios.get<unknown>("/cart");
  return data;
}

export async function updateCartItem(itemId: string, body: Pick<AddCartItemBody, "quantity" | "lens_params">) {
  const payload: Record<string, unknown> = {
    quantity: body.quantity,
  };
  if (body.lens_params) {
    payload.lens_params = body.lens_params;
  }
  const { data } = await axios.put<unknown>(`/cart/items/${encodeURIComponent(itemId)}`, payload);
  return data;
}

export async function deleteCartItem(itemId: string) {
  const { data } = await axios.delete<unknown>(`/cart/items/${encodeURIComponent(itemId)}`);
  return data;
}

export async function updateCartComboItem(
  comboId: string,
  body: Pick<AddCartItemBody, "quantity" | "lens_params">
) {
  const payload: Record<string, unknown> = {
    quantity: body.quantity,
  };
  if (body.lens_params) {
    payload.lens_params = body.lens_params;
  }
  const { data } = await axios.put<unknown>(`/cart/combo-items/${encodeURIComponent(comboId)}`, payload);
  return data;
}

export async function deleteCartComboItem(comboId: string) {
  const { data } = await axios.delete<unknown>(`/cart/combo-items/${encodeURIComponent(comboId)}`);
  return data;
}

export async function clearCart() {
  const { data } = await axios.delete<unknown>("/cart/clear");
  return data;
}
