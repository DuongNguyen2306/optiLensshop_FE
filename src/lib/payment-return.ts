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
    params.get("id"),
    params.get("vnp_TxnRef"),
    params.get("vnpTxnRef")
  );
  const message = firstNonEmpty(params.get("msg"), params.get("message"), params.get("error"), params.get("errorMessage"));
  return { orderId, message };
}

/** Gateway đôi khi redirect nhầm route fail dù mã giao dịch là success. */
export function isSuccessfulGatewayReturn(params: URLSearchParams): boolean {
  const momoResultCode = firstNonEmpty(params.get("resultCode"), params.get("resultcode"));
  const vnpResponseCode = firstNonEmpty(params.get("vnp_ResponseCode"), params.get("vnp_responsecode"));
  if (momoResultCode === "0" || momoResultCode === "1000") return true;
  if (vnpResponseCode === "00") return true;
  return false;
}
