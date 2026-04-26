import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageX } from "lucide-react";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { getApiErrorMessage } from "@/lib/api-error";
import { fetchMyReturns } from "@/services/returns.service";
import type { ReturnRequest, ReturnStatus } from "@/types/returns";

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: "",           label: "Tất cả"                   },
  { value: "PENDING",    label: "Chờ duyệt"                },
  { value: "APPROVED",   label: "Đã chấp nhận trả"         },
  { value: "INSPECTING", label: "Đã nhận & đang kiểm tra"  },
  { value: "REFUNDED",   label: "Đã hoàn tiền"             },
  { value: "REJECTED",   label: "Từ chối"                  },
];

function statusBadge(status: ReturnStatus | string | undefined): { label: string; cls: string; hint?: string } {
  const map: Record<string, { label: string; cls: string; hint?: string }> = {
    PENDING: {
      label: "Chờ duyệt",
      cls: "bg-yellow-100 text-yellow-800",
      hint: "Shop đang xem xét yêu cầu của bạn.",
    },
    APPROVED: {
      label: "Đã chấp nhận trả",
      cls: "bg-blue-100 text-blue-700",
      hint: "Vui lòng đóng gói và gửi hàng về kho theo hướng dẫn.",
    },
    INSPECTING: {
      label: "Đã nhận & đang kiểm tra",
      cls: "bg-purple-100 text-purple-700",
      hint: "Shop đã nhận hàng và đang kiểm tra tình trạng.",
    },
    REFUNDED: {
      label: "Đã hoàn tiền",
      cls: "bg-emerald-100 text-emerald-700",
    },
    REJECTED: {
      label: "Từ chối",
      cls: "bg-red-100 text-red-700",
    },
    // Legacy
    RECEIVED:   { label: "Đã nhận hàng",  cls: "bg-blue-50 text-blue-600",     hint: "Shop đã nhận hàng và đang xử lý." },
    PROCESSING: { label: "Đang xử lý",    cls: "bg-orange-100 text-orange-700", hint: "Yêu cầu đang được xử lý."         },
    COMPLETED:  { label: "Hoàn tất",      cls: "bg-emerald-50 text-emerald-600" },
  };
  const s = String(status ?? "").toUpperCase();
  return map[s] ?? { label: s || "—", cls: "bg-slate-100 text-slate-600" };
}

function reasonLabel(cat: string | undefined): string {
  const map: Record<string, string> = {
    damaged_on_arrival: "Hàng hỏng khi nhận",
    wrong_item: "Sai sản phẩm",
    changed_mind: "Đổi ý",
    defective: "Sản phẩm lỗi",
    other: "Lý do khác",
  };
  return map[cat ?? ""] ?? cat ?? "—";
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("vi-VN");
}

function fmtMoney(n: number | undefined): string {
  if (!n || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

function getOrderId(req: ReturnRequest): string {
  if (!req.order_id) return "—";
  if (typeof req.order_id === "string") return req.order_id.slice(-8);
  const o = req.order_id as Record<string, unknown>;
  const raw = o._id ?? o.id;
  return typeof raw === "string" ? raw.slice(-8) : "—";
}

const PAGE_SIZE = 10;

export default function MyReturnsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["returns", "my", page, statusFilter],
    queryFn: async () => {
      try {
        return await fetchMyReturns({ status: statusFilter || undefined, page, pageSize: PAGE_SIZE });
      } catch (e) {
        toast.error(getApiErrorMessage(e, "Không tải được danh sách yêu cầu trả hàng."));
        throw e;
      }
    },
  });

  const returns: ReturnRequest[] = query.data?.returns ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Yêu cầu trả hàng</h1>
            <p className="mt-0.5 text-sm text-slate-500">Theo dõi trạng thái các yêu cầu trả hàng của bạn.</p>
          </div>
          <Link to="/orders" className="text-sm font-medium text-[#2bb6a3] hover:underline">← Đơn hàng</Link>
        </div>

        {/* Filter */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-400"
          >
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-sm text-slate-500">Tổng: <strong>{total}</strong> yêu cầu</span>
        </div>

        {/* Content */}
        {query.isPending ? (
          <p className="mt-6 text-slate-600">Đang tải…</p>
        ) : query.isError ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được danh sách yêu cầu.
          </p>
        ) : returns.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <PackageX className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">Chưa có yêu cầu trả hàng.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {returns.map((req) => {
              const rid = String(req._id ?? req.id ?? "");
              const badge = statusBadge(req.status);
              return (
                <div key={rid} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">Mã đơn gốc: <span className="font-mono font-medium text-slate-700">#{getOrderId(req)}</span></p>
                      <p className="mt-0.5 text-xs text-slate-400">Ngày tạo: {fmtDate(req.createdAt)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                  </div>
                  {badge.hint ? (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 italic">{badge.hint}</p>
                  ) : null}
                  <div className="mt-3 text-sm">
                    <p><span className="text-slate-500">Loại lý do: </span>{reasonLabel(req.reason_category as string)}</p>
                    <p className="mt-1 text-slate-700">{req.return_reason ?? "—"}</p>
                  </div>
                  {req.status === "REJECTED" && req.rejected_reason ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      <strong>Lý do từ chối:</strong> {req.rejected_reason}
                    </p>
                  ) : null}
                  {(req.status === "REFUNDED" || req.status === "COMPLETED") && req.refund_amount ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Hoàn tiền: {fmtMoney(req.refund_amount)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">Trang {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40"
              >
                ← Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
