export interface PaymentReturnParams {
  orderId: string;
  message: string;
}

function firstNonEmpty(...values: Array<string | null>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function readPaymentReturnParams(params: URLSearchParams): PaymentReturnParams {
  const orderId = firstNonEmpty(
    params.get("orderId"),
    params.get("orderID"),
    params.get("orderid"),
    params.get("order_id"),
    params.get("id")
  );
  const message = firstNonEmpty(params.get("msg"), params.get("message"), params.get("error"), params.get("errorMessage"));
  return { orderId, message };
}
