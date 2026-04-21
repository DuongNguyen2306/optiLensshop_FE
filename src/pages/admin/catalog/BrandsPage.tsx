import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createBrand, deleteBrand, fetchBrands, updateBrand } from "@/features/catalog/api";
import type { Brand } from "@/features/catalog/types";
import { entityId } from "@/features/catalog/types";
import { getApiErrorMessage } from "@/lib/api-error";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BrandsPage() {
  const [list, setList] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchBrands();
      setList(items);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được thương hiệu."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setLogo("");
    setEditing(null);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("name là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      await createBrand({
        name: name.trim(),
        description: description.trim() || undefined,
        logo: logo.trim() || undefined,
      });
      toast.success("Đã tạo thương hiệu.");
      resetForm();
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editing ? entityId(editing) : "";
    if (!id) {
      return;
    }
    setSaving(true);
    try {
      await updateBrand(id, {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        logo: logo.trim() || undefined,
      });
      toast.success("Đã cập nhật.");
      resetForm();
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Brand) => {
    setEditing(b);
    setName(b.name);
    setDescription(b.description ?? "");
    setLogo(b.logo ?? "");
  };

  const onConfirmDelete = async () => {
    const id = deleteTarget ? entityId(deleteTarget) : "";
    if (!id) {
      return;
    }
    setDeleting(true);
    try {
      await deleteBrand(id);
      toast.success("Đã xóa (soft delete).");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Thương hiệu</h1>
      <p className="mb-6 text-sm text-slate-500">GET công khai; CRUD chỉ manager hoặc admin.</p>

      <form
        onSubmit={editing ? onUpdate : onCreate}
        className="mb-8 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="font-semibold text-slate-900">{editing ? "Sửa thương hiệu" : "Tạo thương hiệu"}</h2>
        <div className="space-y-1">
          <Label>name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>description</Label>
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>logo (URL hoặc string theo BE)</Label>
          <Input value={logo} onChange={(e) => setLogo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="bg-teal-600">
            {saving ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo mới"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Hủy sửa
            </Button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2">Mô tả</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const id = entityId(b);
                return (
                  <tr key={id || b.name} className="border-b border-slate-100">
                    <td className="max-w-[120px] truncate px-4 py-2 font-mono text-xs">{id || "—"}</td>
                    <td className="px-4 py-2 font-medium">{b.name}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-slate-600">{b.description ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Button type="button" variant="ghost" className="text-teal-600" onClick={() => startEdit(b)}>
                        Sửa
                      </Button>
                      <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(b)}>
                        Xóa
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 ? <p className="p-6 text-center text-slate-500">Chưa có dữ liệu.</p> : null}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa thương hiệu?"
        description={deleteTarget ? `Thương hiệu: ${deleteTarget.name}` : null}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
