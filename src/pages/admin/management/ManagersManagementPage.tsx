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
  createManager,
  deleteManager,
  listManagers,
  updateManager,
} from "@/services/management.service";
import type { ManagementUser, UserStatus } from "@/types/management";

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

export default function ManagersManagementPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagementUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagementUser | null>(null);

  const managersQuery = useQuery({
    queryKey: managementQueryKeys.managers(),
    queryFn: listManagers,
  });

  const createMutation = useMutation({
    mutationFn: createManager,
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã tạo manager.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.managers() });
      setCreateOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: UserStatus } }) => updateManager(id, body),
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã cập nhật manager.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.managers() });
      setEditUser(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManager,
    onSuccess: (data) => {
      toast.success(data.message ?? "Đã xóa manager.");
      queryClient.invalidateQueries({ queryKey: managementQueryKeys.managers() });
      setDeleteUser(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Managers</h1>
          <p className="mt-1 text-sm text-slate-600">Chỉ admin. Chỉnh sửa chỉ cho phép đổi status.</p>
        </div>
        <Button type="button" className="bg-[#2bb6a3] hover:brightness-[0.98]" onClick={() => setCreateOpen(true)}>
          + Thêm manager
        </Button>
      </div>

      {managersQuery.isPending ? (
        <TableSkeleton />
      ) : managersQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(managersQuery.error, "Không tải được danh sách manager.")}
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
              {(managersQuery.data ?? []).map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.role}</td>
                  <td className="px-4 py-3">{u.status}</td>
                  <td className="px-4 py-3">{u.is_email_verified ? "Có" : "Chưa"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" className="text-[#2bb6a3]" onClick={() => setEditUser(u)}>
                      Sửa status
                    </Button>
                    <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteUser(u)}>
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(managersQuery.data?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Chưa có manager.</p>
          ) : null}
        </div>
      )}

      <ManagerCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        loading={createMutation.isPending}
        onSubmit={(body) => createMutation.mutate(body)}
      />

      {editUser ? (
        <ManagerEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          loading={updateMutation.isPending}
          onSubmit={(status) => updateMutation.mutate({ id: editUser.id, body: { status } })}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteUser}
        title="Xóa manager?"
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

function ManagerCreateModal({
  open,
  onClose,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onSubmit: (body: { email: string; password: string; status?: UserStatus }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<UserStatus>("active");

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setStatus("active");
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  return (
    <ManagementModal
      open={open}
      title="Thêm manager"
      description="BE gán role manager. Email và mật khẩu bắt buộc."
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
              onSubmit({ email: email.trim(), password, status });
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
          <Label>Status (tùy chọn)</Label>
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

function ManagerEditModal({
  user,
  onClose,
  loading,
  onSubmit,
}: {
  user: ManagementUser;
  onClose: () => void;
  loading: boolean;
  onSubmit: (status: UserStatus) => void;
}) {
  const [status, setStatus] = useState<UserStatus>(
    STATUSES.includes(user.status as UserStatus) ? (user.status as UserStatus) : "active"
  );

  useEffect(() => {
    setStatus(STATUSES.includes(user.status as UserStatus) ? (user.status as UserStatus) : "active");
  }, [user]);

  return (
    <ManagementModal
      open
      title="Cập nhật status manager"
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
              if (status === user.status) {
                toast.info("Status không thay đổi.");
                return;
              }
              onSubmit(status);
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
          <Input value={user.role} disabled className="bg-slate-100 text-slate-500" />
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
