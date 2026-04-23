import axios from "@/lib/axios";
import { normalizeMongoId } from "@/lib/mongo-id";
import type { AddCartItemBody } from "@/types/shop";

export async function postCartItem(body: AddCartItemBody) {
  const payload: Record<string, unknown> = {
    quantity: body.quantity,
    lens_params: body.lens_params ?? {},
  };
  if (body.combo_id) {
    const comboId = normalizeMongoId(body.combo_id);
    if (!comboId) {
      throw new Error("combo_id không hợp lệ (yêu cầu Mongo ObjectId).");
    }
    payload.combo_id = comboId;
  } else if (body.variant_id) {
    const variantId = normalizeMongoId(body.variant_id);
    if (!variantId) {
      throw new Error("variant_id không hợp lệ (yêu cầu Mongo ObjectId).");
    }
    payload.variant_id = variantId;
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
  if ("lens_params" in body && body.lens_params !== undefined) {
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
  if ("lens_params" in body && body.lens_params !== undefined) {
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
