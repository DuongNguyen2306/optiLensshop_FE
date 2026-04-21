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
