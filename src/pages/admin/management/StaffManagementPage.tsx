import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ManagementModal from "@/components/admin/ManagementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { managementQueryKeys } from "@/lib/management-query-keys";
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from "@/services/management.service";
import type { ManagementUser, StaffAssignableRole, UserStatus } from "@/types/management";

const STAFF_ROLES: StaffAssignableRole[] = ["sales", "operations", "manager"];
const STATUSES: UserStatus[] = ["active", "inactive", "banned", "pending"];

function TableSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}

export default function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagementUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagementUser | null>(null);

  const staffQuery = useQuery({
    queryKey: managementQueryKeys.staff(),
    queryFn: listStaff,
  });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã tạo staff.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.staff() });
      setCreateOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: StaffAssignableRole; status?: UserStatus } }) =>
      updateStaff(id, body),
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã cập nhật staff.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.staff() });
      setEditUser(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã xóa staff.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.staff() });
      setDeleteUser(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Staff</h1>
          <p className="mt-1 text-sm text-slate-600">Chỉ manager hoặc admin. Role staff: sales, operations, manager.</p>
        </div>
        <Button type="button" className="bg-[#2bb6a3] hover:brightness-[0.98]" onClick={() => setCreateOpen(true)}>
          + Thêm staff
        </Button>
      </div>

      {staffQuery.isPending ? (
        <TableSkeleton />
      ) : staffQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(staffQuery.error, "Không tải được danh sách staff.")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Email xác thực</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(staffQuery.data ?? []).map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.status}</td>
                  <td className="px-4 py-3">{u.is_email_verified ? "Có" : "Chưa"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" className="text-[#2bb6a3]" onClick={() => setEditUser(u)}>
                      Sửa
                    </Button>
                    <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteUser(u)}>
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(staffQuery.data?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Chưa có staff.</p>
          ) : null}
        </div>
      )}

      <StaffCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        loading={createMutation.isPending}
        onSubmit={(body) => createMutation.mutate(body)}
      />

      {editUser ? (
        <StaffEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          loading={updateMutation.isPending}
          onSubmit={(body) => {
            if (!body.role && !body.status) {
              toast.error("Chọn ít nhất một trường để cập nhật.");
              return;
            }
            updateMutation.mutate({ id: editUser.id, body });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteUser}
        title="Xóa staff?"
        description={deleteUser ? `Tài khoản: ${deleteUser.email}` : undefined}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => {
          if (deleteUser) {
            deleteMutation.mutate(deleteUser.id);
          }
        }}
      />
    </div>
  );
}

function StaffCreateModal({
  open,
  onClose,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onSubmit: (body: { email: string; password: string; role: StaffAssignableRole; status?: UserStatus }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffAssignableRole>("sales");
  const [status, setStatus] = useState<UserStatus>("active");

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setRole("sales");
      setStatus("active");
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  return (
    <ManagementModal
      open={open}
      title="Thêm staff"
      description="Email, mật khẩu, role và trạng thái."
      onClose={handleClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            className="bg-[#2bb6a3]"
            disabled={loading}
            onClick={() => {
              if (!email.trim() || !password) {
                toast.error("Email và mật khẩu là bắt buộc.");
                return;
              }
              onSubmit({ email: email.trim(), password, role, status });
            }}
          >
            {loading ? "Đang tạo…" : "Tạo"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <div className="space-y-1">
          <Label>Mật khẩu</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <select
            className="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffAssignableRole)}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </ManagementModal>
  );
}

function StaffEditModal({
  user,
  onClose,
  loading,
  onSubmit,
}: {
  user: ManagementUser;
  onClose: () => void;
  loading: boolean;
  onSubmit: (body: { role?: StaffAssignableRole; status?: UserStatus }) => void;
}) {
  const [role, setRole] = useState<StaffAssignableRole>(
    STAFF_ROLES.includes(user.role as StaffAssignableRole) ? (user.role as StaffAssignableRole) : "sales"
  );
  const [status, setStatus] = useState<UserStatus>(
    STATUSES.includes(user.status as UserStatus) ? (user.status as UserStatus) : "active"
  );

  useEffect(() => {
    setRole(STAFF_ROLES.includes(user.role as StaffAssignableRole) ? (user.role as StaffAssignableRole) : "sales");
    setStatus(STATUSES.includes(user.status as UserStatus) ? (user.status as UserStatus) : "active");
  }, [user]);

  return (
    <ManagementModal
      open
      title="Sửa staff"
      description={user.email}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            className="bg-[#2bb6a3]"
            disabled={loading}
            onClick={() => {
              const body: { role?: StaffAssignableRole; status?: UserStatus } = {};
              if (role !== user.role) {
                body.role = role;
              }
              if (status !== user.status) {
                body.status = status;
              }
              onSubmit(body);
            }}
          >
            {loading ? "Đang lưu…" : "Lưu"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Role</Label>
          <select
            className="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffAssignableRole)}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">Chỉ các trường thay đổi được gửi lên BE.</p>
      </div>
    </ManagementModal>
  );
}
