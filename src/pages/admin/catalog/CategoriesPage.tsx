import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "@/features/catalog/api";
import type { Category } from "@/features/catalog/types";
import { entityId } from "@/features/catalog/types";
import { getApiErrorMessage } from "@/lib/api-error";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CategoriesPage() {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchCategories();
      setList(items);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được danh mục."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setParentId("");
    setEditing(null);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("name và slug là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      await createCategory({
        name: name.trim(),
        slug: slug.trim(),
        parent_id: parentId.trim() || undefined,
      });
      toast.success("Đã tạo danh mục.");
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
      await updateCategory(id, {
        name: name.trim() || undefined,
        slug: slug.trim() || undefined,
        parent_id: parentId.trim() ? parentId.trim() : null,
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

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setParentId(c.parent_id ?? "");
  };

  const onConfirmDelete = async () => {
    const id = deleteTarget ? entityId(deleteTarget) : "";
    if (!id) {
      return;
    }
    setDeleting(true);
    try {
      await deleteCategory(id);
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
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Danh mục</h1>
      <p className="mb-6 text-sm text-slate-500">GET công khai; tạo/sửa/xóa chỉ manager hoặc admin.</p>

      <form
        onSubmit={editing ? onUpdate : onCreate}
        className="mb-8 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="font-semibold text-slate-900">{editing ? "Sửa danh mục" : "Tạo danh mục"}</h2>
        <div className="space-y-1">
          <Label>name {!editing ? "*" : ""}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required={!editing} />
        </div>
        <div className="space-y-1">
          <Label>slug {!editing ? "*" : ""}</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required={!editing} />
        </div>
        <div className="space-y-1">
          <Label>parent_id (ObjectId, tùy chọn)</Label>
          <Input value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Để trống = null" />
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
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">parent_id</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const id = entityId(c);
                return (
                  <tr key={id || c.slug} className="border-b border-slate-100">
                    <td className="max-w-[120px] truncate px-4 py-2 font-mono text-xs">{id || "—"}</td>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.slug}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.parent_id ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Button type="button" variant="ghost" className="text-teal-600" onClick={() => startEdit(c)}>
                        Sửa
                      </Button>
                      <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(c)}>
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
        title="Xóa danh mục?"
        description={deleteTarget ? `Danh mục: ${deleteTarget.name} (${deleteTarget.slug})` : null}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
