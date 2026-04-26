import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { getInbounds } from "@/api/inboundApi";
import { INBOUND_STATUS_LABEL } from "@/constants/inbound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  nextStatusesByOrderType,
  normalizeOrderStatus,
  orderReadableStatus,
  orderTypeForListApi,
} from "@/lib/order-utils";
import type { OrderKindFilter } from "@/lib/order-utils";
import { normalizeRole } from "@/lib/role-routing";
import { getOpsOrders } from "@/services/ops-orders.service";
import { confirmOrder, fetchAllOrders, updateOrderStatus } from "@/services/order.service";
import { useAppSelector } from "@/store/hooks";
import type { CustomerOrderListItem } from "@/types/order";

function toOrderArray(data: unknown): CustomerOrderListItem[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const o = data as Record<string, unknown>;
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const nested = o.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) {
      return nested.items as CustomerOrderListItem[];
    }
    if (Array.isArray(nested.orders)) {
      return nested.orders as CustomerOrderListItem[];
    }
  }
  if (Array.isArray(o.items)) {
    return o.items as CustomerOrderListItem[];
  }
  if (Array.isArray(o.data)) {
    return o.data as CustomerOrderListItem[];
  }
  if (Array.isArray(o.orders)) {
    return o.orders as CustomerOrderListItem[];
  }
  return [];
}

function toPagination(
  data: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackRows: number
): { page: number; total_pages: number; total: number } {
  const readNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) {
        return n;
      }
    }
    return null;
  };

  if (!data || typeof data !== "object") {
    return { page: fallbackPage, total_pages: 1, total: fallbackRows };
  }
  const o = data as Record<string, unknown>;
  const pg =
    (o.pagination && typeof o.pagination === "object" ? (o.pagination as Record<string, unknown>) : null) ??
    (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : null) ??
    null;

  const rootPage = readNum(o.page) ?? readNum(o.current_page) ?? readNum(o.currentPage);
  const rootLimit = readNum(o.limit) ?? readNum(o.page_size) ?? readNum(o.pageSize) ?? readNum(o.per_page);
  const rootTotal = readNum(o.total) ?? readNum(o.total_items) ?? readNum(o.totalItems) ?? readNum(o.count);
  const rootTotalPages = readNum(o.total_pages) ?? readNum(o.totalPages) ?? readNum(o.pages) ?? readNum(o.last_page);

  if (!pg) {
    const total = rootTotal ?? fallbackRows;
    const limit = rootLimit ?? fallbackLimit;
    const totalPages = rootTotalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
    return {
      page: rootPage ?? fallbackPage,
      total_pages: totalPages,
      total,
    };
  }

  const p = pg;
  const page =
    readNum(p.page) ?? readNum(p.current_page) ?? readNum(p.currentPage) ?? rootPage ?? fallbackPage;
  const limit =
    readNum(p.limit) ??
    readNum(p.page_size) ??
    readNum(p.pageSize) ??
    readNum(p.per_page) ??
    rootLimit ??
    fallbackLimit;
  const total =
    readNum(p.total) ?? readNum(p.total_items) ?? readNum(p.totalItems) ?? rootTotal ?? fallbackRows;
  const totalPages =
    readNum(p.total_pages) ??
    readNum(p.totalPages) ??
    readNum(p.pages) ??
    readNum(p.last_page) ??
    rootTotalPages ??
    Math.max(1, Math.ceil(total / Math.max(1, limit)));

  return {
    page,
    total_pages: totalPages,
    total,
  };
}

function readOrderId(order: CustomerOrderListItem): string {
  const raw = order._id ?? order.id ?? (order as Record<string, unknown>).order_id;
  return typeof raw === "string" ? raw : "";
}

function readPaymentMethod(order: CustomerOrderListItem): string {
  const pay = order.payment as Record<string, unknown> | undefined;
  return String(pay?.method ?? "").toLowerCase();
}

function readPaymentStatus(order: CustomerOrderListItem): string {
  const pay = order.payment as Record<string, unknown> | undefined;
  return String(pay?.status ?? "").toLowerCase();
}

function readCustomerLabel(order: CustomerOrderListItem): string {
  const user = order.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (typeof u.email === "string" && u.email.trim()) {
      return u.email.trim();
    }
  }
  if (typeof order.user_id === "string" && order.user_id.trim()) {
    return order.user_id.trim();
  }
  return "—";
}

function formatMoney(amount: number | undefined): string {
  if (!Number.isFinite(amount ?? NaN)) {
    return "—";
  }
  return `${Math.round(amount ?? 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("vi-VN");
}

const STATUS_OPTIONS = [
  "",
  "pending",
  "confirmed",
  "processing",
  "manufacturing",
  "received",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
] as const;
const OPS_STATUS_FILTER_OPTIONS = ["", "processing", "manufacturing", "received", "packed", "shipped", "delivered"] as const;
const PAYMENT_METHOD_OPTIONS = ["", "cod", "momo"];
const PAYMENT_STATUS_OPTIONS = ["", "pending", "paid", "failed", "cancelled"];
const OPS_MANAGED_STATUSES = new Set([
  "processing",
  "manufacturing",
  "received",
  "packed",
  "shipped",
  "delivered",
]);
const SALES_MANAGED_STATUSES = new Set(["confirmed", "cancelled"]);

function readLensWorksheet(order: CustomerOrderListItem): Record<string, unknown> | null {
  const raw = (order as Record<string, unknown>).lens_worksheet;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function readItems(order: CustomerOrderListItem): Array<Record<string, unknown>> {
  return Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
}

function hasMeaningfulLensValue(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }
  const rec = raw as Record<string, unknown>;
  for (const [key, value] of Object.entries(rec)) {
    if (key === "note") {
      const note = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (note && note !== "không có ghi chú") {
        return true;
      }
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value) && value !== 0) {
      return true;
    }
    if (typeof value === "string" && value.trim()) {
      const n = Number(value.trim());
      if (Number.isFinite(n)) {
        if (n !== 0) {
          return true;
        }
      } else {
        return true;
      }
    }
  }
  return false;
}

function isLensTypeItem(item: Record<string, unknown>): boolean {
  const variantRaw = item.variant_id;
  if (!variantRaw || typeof variantRaw !== "object") {
    return false;
  }
  const variant = variantRaw as Record<string, unknown>;
  const productRaw = variant.product_id;
  if (!productRaw || typeof productRaw !== "object") {
    return false;
  }
  const product = productRaw as Record<string, unknown>;
  return String(product.type ?? "").toLowerCase() === "lens";
}

function orderNeedsProcessing(order: CustomerOrderListItem): boolean {
  const worksheet = readLensWorksheet(order);
  if (hasMeaningfulLensValue(worksheet)) {
    return true;
  }
  const items = readItems(order);
  return items.some((item) => hasMeaningfulLensValue(item.lens_params) || isLensTypeItem(item));
}

function itemVariantInfo(item: Record<string, unknown>): { name: string; sku: string; price: number | null; image: string } {
  const variantRaw = item.variant_id;
  const variant = variantRaw && typeof variantRaw === "object" ? (variantRaw as Record<string, unknown>) : null;
  const productRaw = variant?.product_id;
  const product = productRaw && typeof productRaw === "object" ? (productRaw as Record<string, unknown>) : null;
  const name = typeof product?.name === "string" ? product.name : "—";
  const sku = typeof variant?.sku === "string" ? variant.sku : "—";
  const price = typeof variant?.price === "number" ? variant.price : null;
  const variantImage = Array.isArray(variant?.images) ? (variant.images.find((x): x is string => typeof x === "string" && Boolean(x.trim())) ?? "") : "";
  const productImage = Array.isArray(product?.images) ? (product.images.find((x): x is string => typeof x === "string" && Boolean(x.trim())) ?? "") : "";
  return { name, sku, price, image: variantImage || productImage || "" };
}

function extractReferenceOrderIds(inbound: Record<string, unknown>): string[] {
  const direct = [inbound.reference_order_id, inbound.reference_order, inbound.order_id]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  const refs = inbound.reference_orders;
  const nested = Array.isArray(refs)
    ? refs
        .map((ref) => {
          if (typeof ref === "string") return ref.trim();
          if (ref && typeof ref === "object") {
            const o = ref as Record<string, unknown>;
            const raw = o._id ?? o.id ?? o.order_id ?? o.reference_order_id;
            return typeof raw === "string" ? raw.trim() : "";
          }
          return "";
        })
        .filter(Boolean)
    : [];
  return Array.from(new Set([...direct, ...nested]));
}

function inboundUiLabel(status: string): string {
  const s = status.toUpperCase();
  return INBOUND_STATUS_LABEL[s] ?? s;
}

export default function InternalOrdersPage() {
  const queryClient = useQueryClient();
  const role = useAppSelector((s) => normalizeRole(s.auth.user?.role) ?? "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderKind, setOrderKind] = useState<OrderKindFilter>("");
  const [confirmState, setConfirmState] = useState<{
    orderId: string;
    mode: "sales_confirm" | "sales_reject" | "ops_update";
    title: string;
    description?: string;
    nextStatus?: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSales = role === "sales";
  const isOps = role === "operations" || role === "manager" || role === "admin";
  const isOperationsRole = role === "operations" || role === "manager" || role === "admin";
  const canUseSalesActions = role === "sales" || role === "manager" || role === "admin";

  const orderTypeApi = orderTypeForListApi(orderKind);

  const ordersQuery = useQuery({
    queryKey: ["orders", isOps ? "ops" : "all", page, limit, status, paymentMethod, paymentStatus, orderKind],
    queryFn: async () => {
      if (isOps) {
        const normalizedStatus =
          status === "processing" ||
          status === "manufacturing" ||
          status === "received" ||
          status === "packed" ||
          status === "shipped" ||
          status === "delivered"
            ? status
            : undefined;
        const opsData = await getOpsOrders({
          page,
          pageSize: limit,
          status: normalizedStatus,
          order_type: orderTypeApi,
        });
        const opsRows = toOrderArray(opsData);
        if (opsRows.length > 0 || normalizedStatus) {
          return opsData;
        }
        // Fallback: some environments still expose full internal orders on /orders/all.
        return fetchAllOrders({
          page,
          limit,
          status: undefined,
          payment_method: paymentMethod || undefined,
          payment_status: paymentStatus || undefined,
          order_type: orderTypeApi,
        });
      }
      return fetchAllOrders({
        page,
        limit,
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        payment_status: paymentStatus || undefined,
        order_type: orderTypeApi,
      });
    },
  });

  const rows = useMemo(() => {
    const list = toOrderArray(ordersQuery.data);
    if (isOps && status) {
      return list.filter((order) => normalizeOrderStatus(String(order.status ?? "")) === status);
    }
    return list;
  }, [ordersQuery.data, isOps, status]);
  const pagination = useMemo(
    () => toPagination(ordersQuery.data, page, limit, rows.length),
    [ordersQuery.data, page, limit, rows.length]
  );

  const inboundLinksQuery = useQuery({
    queryKey: ["inbounds", "linked-orders", page, limit, status, orderKind],
    enabled: rows.length > 0,
    queryFn: () => getInbounds({ page: 1, pageSize: 200 }),
    staleTime: 10_000,
  });
  const inboundByOrderId = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>();
    const list = inboundLinksQuery.data?.items ?? [];
    for (const it of list) {
      const rec = it as Record<string, unknown>;
      const inboundId = String(rec._id ?? rec.id ?? "");
      const inboundStatus = String(rec.status ?? "DRAFT").toUpperCase();
      for (const oid of extractReferenceOrderIds(rec)) {
        const prev = map.get(oid);
        if (!prev) {
          map.set(oid, { id: inboundId, status: inboundStatus });
          continue;
        }
        const rank = (s: string) => ["DRAFT", "PENDING_APPROVAL", "APPROVED", "RECEIVED", "COMPLETED", "CANCELLED"].indexOf(s);
        if (rank(inboundStatus) > rank(prev.status)) {
          map.set(oid, { id: inboundId, status: inboundStatus });
        }
      }
    }
    return map;
  }, [inboundLinksQuery.data?.items]);

  const confirmMutation = useMutation({
    mutationFn: (payload: { orderId: string; action: "confirm" | "reject"; reason?: string; orderType?: string }) =>
      confirmOrder(payload.orderId, { action: payload.action, reason: payload.reason }),
    onSuccess: (_data, variables) => {
      const isPreOrderConfirm =
        variables.action === "confirm" && String(variables.orderType ?? "").toLowerCase() === "pre_order";
      toast.success(
        isPreOrderConfirm
          ? "Đơn pre-order đã xác nhận. Hệ thống đã tự tạo phiếu nhập kho chờ duyệt."
          : "Đã cập nhật trạng thái xác nhận đơn."
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail"] });
      setConfirmState(null);
      setRejectReason("");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể xác nhận/từ chối đơn.")),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: string }) => updateOrderStatus(payload.orderId, { status: payload.status }),
    onSuccess: () => {
      toast.success("Cập nhật trạng thái vận hành thành công.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setConfirmState(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật trạng thái đơn.")),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng nội bộ</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isOps ? "" : "Luồng Sales xác nhận/từ chối đơn."}
        </p>
      </div>

      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1">
          <Label>Loại đơn</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={orderKind}
            onChange={(e) => {
              setOrderKind(e.target.value as OrderKindFilter);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="stock">Hàng kho (stock)</option>
            <option value="pre_order">Pre-order</option>
            <option value="prescription">Gia công (prescription)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Trạng thái đơn</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {isOps
              ? OPS_STATUS_FILTER_OPTIONS.map((s) => (
                  <option key={s || "ops_all"} value={s}>
                    {s ? orderReadableStatus(s) : "Tất cả đơn Ops liên quan"}
                  </option>
                ))
              : STATUS_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s ? orderReadableStatus(s) : "Tất cả"}
                  </option>
                ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Payment method</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
          >
            {PAYMENT_METHOD_OPTIONS.map((v) => (
              <option key={v || "all"} value={v}>
                {v || "Tất cả"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Payment status</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            {PAYMENT_STATUS_OPTIONS.map((v) => (
              <option key={v || "all"} value={v}>
                {v || "Tất cả"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Page size</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Trang hiện tại</Label>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">{page}</div>
        </div>
      </div>

      {ordersQuery.isPending ? (
        <p className="text-slate-600">Đang tải danh sách đơn…</p>
      ) : ordersQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(ordersQuery.error, "Không tải được danh sách đơn nội bộ.")}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          Không có đơn hàng phù hợp bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Inbound</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Lens params</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const id = readOrderId(order);
                const statusValue = normalizeOrderStatus(String(order.status ?? ""));
                const payMethod = readPaymentMethod(order);
                const payStatus = readPaymentStatus(order);
                const lensWorksheet = readLensWorksheet(order);
                const items = readItems(order);
                const needsProcessing = orderNeedsProcessing(order);
                const orderType = String(order.order_type ?? "stock").toLowerCase();
                const linkedInbound = inboundByOrderId.get(id);
                const linkedInboundStatus = linkedInbound?.status ?? "";
                const inboundReady = orderType !== "pre_order" || linkedInboundStatus === "RECEIVED" || linkedInboundStatus === "COMPLETED";
                const inboundStatusText =
                  orderType !== "pre_order"
                    ? "Không yêu cầu"
                    : linkedInboundStatus
                      ? inboundUiLabel(linkedInboundStatus)
                      : "Chưa có phiếu";
                const allNextStatuses = nextStatusesByOrderType(orderType, statusValue);
                const nextStatuses = allNextStatuses.filter((nextStatus) => {
                  if (isOperationsRole) {
                    return OPS_MANAGED_STATUSES.has(nextStatus);
                  }
                  if (canUseSalesActions) {
                    return SALES_MANAGED_STATUSES.has(nextStatus);
                  }
                  return false;
                });
                const nextStatusesFiltered = needsProcessing
                  ? nextStatuses
                  : nextStatuses.filter((s) => s !== "manufacturing");
                const nextStatusesVisible = nextStatusesFiltered.filter((s) => !(orderType === "pre_order" && s === "received" && !inboundReady));
                return (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{id || "—"}</td>
                    <td className="px-4 py-3">{readCustomerLabel(order)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(order.final_amount ?? order.total_amount)}
                    </td>
                    <td className="px-4 py-3">{orderReadableStatus(order.status)}</td>
                    <td className="px-4 py-3">{[payMethod || "—", payStatus || "—"].join(" / ")}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={orderType === "pre_order" ? "rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700" : "text-slate-500"}>
                        {inboundStatusText}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {lensWorksheet ? <pre className="max-w-[250px] overflow-auto whitespace-pre-wrap">{JSON.stringify(lensWorksheet, null, 2)}</pre> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="space-y-2">
                        {items.map((item, idx) => {
                          const info = itemVariantInfo(item);
                          return (
                            <div key={String(item._id ?? item.id ?? idx)} className="rounded border border-slate-200 p-2">
                              <div className="flex items-center gap-2">
                                {info.image ? <img src={info.image} alt={info.name} className="h-8 w-8 object-cover" /> : null}
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-800">{info.name}</p>
                                  <p className="text-slate-500">SKU: {info.sku} | Giá: {formatMoney(info.price ?? undefined)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {isSales && statusValue === "pending" ? (
                          <>
                            <Button
                              type="button"
                              className="h-8 bg-[#2bb6a3] px-3 text-xs"
                              onClick={() =>
                                setConfirmState({
                                  orderId: id,
                                  mode: "sales_confirm",
                                  title: "Xác nhận đơn?",
                                  description: "Sau khi xác nhận, đơn sẽ chuyển sang bước tiếp theo của vận hành.",
                                })
                              }
                            >
                              Xác nhận
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 border-red-200 px-3 text-xs text-red-700"
                              onClick={() => {
                                setRejectReason("");
                                setConfirmState({
                                  orderId: id,
                                  mode: "sales_reject",
                                  title: "Từ chối đơn?",
                                  description: "Nhập lý do từ chối để gửi lên backend (nếu backend hỗ trợ).",
                                });
                              }}
                            >
                              Từ chối
                            </Button>
                          </>
                        ) : null}

                        {/* Sales chỉ dùng Xác nhận / Từ chối cho pending */}
                        {!isSales
                          ? nextStatusesVisible.map((nextStatus) => (
                              <Button
                                key={`${id}_${nextStatus}`}
                                type="button"
                                className="h-8 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                                onClick={() =>
                                  setConfirmState({
                                    orderId: id,
                                    mode: "ops_update",
                                    title: `Chuyển sang "${orderReadableStatus(nextStatus)}"?`,
                                    description: `Đơn sẽ chuyển từ "${orderReadableStatus(statusValue)}" sang "${orderReadableStatus(nextStatus)}".`,
                                    nextStatus,
                                  })
                                }
                              >
                                {orderReadableStatus(nextStatus)}
                              </Button>
                            ))
                          : null}
                        {!isSales && orderType === "pre_order" && nextStatusesFiltered.includes("received") && !inboundReady ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              title="Đơn pre-order chỉ được xác nhận 'hàng đã về' sau khi phiếu nhập đã RECEIVED/COMPLETED."
                              disabled
                            >
                              Hàng đã về kho
                            </Button>
                            <Link to={`/admin/inventory/receipts?refOrder=${encodeURIComponent(id)}`}>
                              <Button type="button" variant="outline" className="h-8 px-3 text-xs">
                                Đi tới phiếu nhập
                              </Button>
                            </Link>
                            {linkedInboundStatus === "PENDING_APPROVAL" || linkedInboundStatus === "APPROVED" ? (
                              <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-amber-700" disabled>
                                Chờ duyệt phiếu nhập
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                        {(statusValue === "return_requested" || statusValue === "returned" || statusValue === "refunded") && isOperationsRole ? (
                          <Link to="/admin/returns">
                            <Button
                              type="button"
                              className="h-8 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
                            >
                              Xử lý trả hàng
                            </Button>
                          </Link>
                        ) : null}
                        <Link to={`/admin/orders/${encodeURIComponent(id)}`}>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                          >
                            Chi tiết
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Tổng: <span className="font-semibold text-slate-900">{pagination.total}</span> đơn · Trên trang: <span className="font-medium">{rows.length}</span> {orderKind ? `đơn sau lọc ${orderKind}` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page <= 1 || ordersQuery.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page >= pagination.total_pages || ordersQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        description={
          <div className="space-y-3">
            <p>{confirmState?.description}</p>
            {confirmState?.title.toLowerCase().includes("từ chối") ? (
              <div className="space-y-1">
                <Label>Lý do từ chối</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do (optional)"
                />
              </div>
            ) : null}
          </div>
        }
        confirmLabel="Xác nhận"
        loading={confirmMutation.isPending || statusMutation.isPending}
        onCancel={() => {
          setConfirmState(null);
          setRejectReason("");
        }}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }
          if (confirmState.mode === "sales_confirm") {
            const selectedOrder = rows.find((o) => readOrderId(o) === confirmState.orderId);
            confirmMutation.mutate({
              orderId: confirmState.orderId,
              action: "confirm",
              orderType: String(selectedOrder?.order_type ?? ""),
            });
            return;
          }
          if (confirmState.mode === "sales_reject") {
            confirmMutation.mutate({
              orderId: confirmState.orderId,
              action: "reject",
              reason: rejectReason.trim() || undefined,
            });
            return;
          }
          if (confirmState.mode === "ops_update") {
            const targetStatus = confirmState.nextStatus;
            if (!targetStatus) {
              toast.error("Không xác định được trạng thái cần chuyển.");
              return;
            }
            statusMutation.mutate({ orderId: confirmState.orderId, status: targetStatus });
            return;
          }
        }}
      />
    </div>
  );
}
