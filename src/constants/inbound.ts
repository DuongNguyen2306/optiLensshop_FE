import type { InboundStatus, InboundType } from "@/types/inbound";

export const INBOUND_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  RECEIVED: "Đã nhận hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export const INBOUND_TYPE_LABEL: Record<string, string> = {
  PURCHASE: "Nhập mua",
  RETURN_RESTOCK: "Nhập hoàn",
  OPENING_BALANCE: "Tồn đầu kỳ",
};

export const INBOUND_TYPE_OPTIONS: InboundType[] = ["PURCHASE", "RETURN_RESTOCK", "OPENING_BALANCE"];
export const INBOUND_STATUS_OPTIONS: InboundStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
];

export const OPS_ROLES = new Set(["operations", "manager", "admin"]);
export const APPROVER_ROLES = new Set(["manager", "admin"]);

export interface InboundActionMatrix {
  canEditDraft: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canReceive: boolean;
  canComplete: boolean;
}

export function inboundActionMatrix(status: string, role: string): InboundActionMatrix {
  const s = status.toUpperCase();
  const r = role.toLowerCase();
  const isOps = OPS_ROLES.has(r);
  const isApprover = APPROVER_ROLES.has(r);

  return {
    canEditDraft: s === "DRAFT" && isOps,
    canSubmit: s === "DRAFT" && isOps,
    canApprove: s === "PENDING_APPROVAL" && isApprover,
    canReject: s === "PENDING_APPROVAL" && isApprover,
    canCancel: (s === "DRAFT" || s === "PENDING_APPROVAL" || s === "APPROVED") && isApprover,
    canReceive: s === "APPROVED" && isOps,
    canComplete: s === "RECEIVED" && isOps,
  };
}

