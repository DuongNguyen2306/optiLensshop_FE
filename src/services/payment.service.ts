import axios from "@/lib/axios";

export interface CreateMomoPaymentBody {
  orderId: string;
}

export interface CreateMomoPaymentResponse {
  payUrl?: string;
}

export interface PaymentConfirmResponse {
  message?: string;
  orderId?: string;
  status?: string;
}

function readPayUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const rec = data as Record<string, unknown>;
  const direct = rec.payUrl ?? rec.pay_url ?? rec.paymentUrl;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  const nested = rec.data;
  if (nested && typeof nested === "object") {
    const deep = nested as Record<string, unknown>;
    const alt = deep.payUrl ?? deep.pay_url ?? deep.paymentUrl;
    if (typeof alt === "string" && alt.trim()) {
      return alt.trim();
    }
  }
  return undefined;
}

function normalizeConfirmResponse(data: unknown): PaymentConfirmResponse {
  if (!data || typeof data !== "object") {
    return {};
  }
  const rec = data as Record<string, unknown>;
  const nested = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : undefined;
  const source = nested ?? rec;
  const orderIdRaw = source.orderId ?? source.order_id ?? source.id;
  return {
    message: typeof source.message === "string" ? source.message : undefined,
    orderId: typeof orderIdRaw === "string" ? orderIdRaw : undefined,
    status: typeof source.status === "string" ? source.status : undefined,
  };
}

export async function createMomoPayment(body: CreateMomoPaymentBody): Promise<CreateMomoPaymentResponse> {
  const payload = { orderId: body.orderId };
  const { data } = await axios.post<unknown>("/momo/create", payload);
  return { payUrl: readPayUrl(data) };
}

export async function confirmPaymentSuccess(orderId: string): Promise<PaymentConfirmResponse> {
  const { data } = await axios.get<unknown>("/payment/success", { params: { orderId } });
  return normalizeConfirmResponse(data);
}

export async function confirmPaymentFail(orderId: string, msg?: string): Promise<PaymentConfirmResponse> {
  const params: Record<string, string> = { orderId };
  if (msg && msg.trim()) {
    params.msg = msg.trim();
  }
  const { data } = await axios.get<unknown>("/payment/fail", { params });
  return normalizeConfirmResponse(data);
}
