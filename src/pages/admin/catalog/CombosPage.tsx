import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import VariantSelect from "@/components/combos/VariantSelect";
import ManagementModal from "@/components/admin/ManagementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { createCombo, deleteCombo, fetchCombos, updateCombo } from "@/services/combo.service";
import type { Combo, ComboMutationBody } from "@/types/combo";
import type { Variant } from "@/types/variant";

function comboId(c: Combo): string {
  return String(c._id ?? c.id ?? "");
}

export default function CombosAdminPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null);

  const combosQuery = useQuery({
    queryKey: ["combos", "admin"],
    queryFn: () => fetchCombos({ page: 1, limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: (body: ComboMutationBody) => createCombo(body),
    onSuccess: () => {
      toast.success("Tạo combo thành công.");
      queryClient.invalidateQueries({ queryKey: ["combos"] });
      setCreateOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể tạo combo.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ComboMutationBody> }) => updateCombo(id, body),
    onSuccess: () => {
      toast.success("Cập nhật combo thành công.");
      queryClient.invalidateQueries({ queryKey: ["combos"] });
      setEditCombo(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể cập nhật combo.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCombo(id),
    onSuccess: () => {
      toast.success("Đã xóa combo.");
      queryClient.invalidateQueries({ queryKey: ["combos"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể xóa combo.")),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Combo</h1>
          <p className="text-sm text-slate-600">CRUD combos: frame variant + lens variant + giá combo.</p>
        </div>
        <Button type="button" className="bg-[#2bb6a3]" onClick={() => setCreateOpen(true)}>
          + Tạo combo
        </Button>
      </div>

      {combosQuery.isPending ? (
        <p className="text-slate-600">Đang tải combos…</p>
      ) : combosQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(combosQuery.error, "Không tải được danh sách combo.")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Giá combo</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(combosQuery.data?.items ?? []).map((c) => (
                <tr key={comboId(c)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.slug ?? "—"}</td>
                  <td className="px-4 py-3">{typeof c.combo_price === "number" ? c.combo_price.toLocaleString("vi-VN") : "—"}đ</td>
                  <td className="px-4 py-3">{(c.is_active ?? c.active) ? "Hiện" : "Ẩn"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" className="text-[#2bb6a3]" onClick={() => setEditCombo(c)}>
                      Sửa
                    </Button>
                    <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(c)}>
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(combosQuery.data?.items.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Chưa có combo.</p>
          ) : null}
        </div>
      )}

      <ComboMutationModal
        open={createOpen}
        title="Tạo combo"
        loading={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(body) => createMutation.mutate(body)}
      />

      {editCombo ? (
        <ComboMutationModal
          open
          title="Sửa combo"
          loading={updateMutation.isPending}
          initial={editCombo}
          onClose={() => setEditCombo(null)}
          onSubmit={(body) => {
            const id = comboId(editCombo);
            if (!id) {
              toast.error("Thiếu ID combo.");
              return;
            }
            updateMutation.mutate({ id, body });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa combo?"
        description={deleteTarget ? `Combo: ${deleteTarget.name ?? comboId(deleteTarget)}` : undefined}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteMutation.mutate(comboId(deleteTarget));
        }}
      />
    </div>
  );
}

function ComboMutationModal({
  open,
  title,
  loading,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  initial?: Combo;
  onClose: () => void;
  onSubmit: (body: ComboMutationBody) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [comboPrice, setComboPrice] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [selectedFrameVariant, setSelectedFrameVariant] = useState<Variant | null>(null);
  const [selectedLensVariant, setSelectedLensVariant] = useState<Variant | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(String(initial?.name ?? ""));
    setSlug(String(initial?.slug ?? ""));
    setDescription(String(initial?.description ?? ""));
    setComboPrice(String(initial?.combo_price ?? 0));
    setIsActive(Boolean(initial?.is_active ?? initial?.active ?? true));
    const frameId =
      typeof initial?.frame_variant_id === "string" ? initial.frame_variant_id : String(initial?.frame_variant_id?._id ?? "");
    const lensId =
      typeof initial?.lens_variant_id === "string" ? initial.lens_variant_id : String(initial?.lens_variant_id?._id ?? "");
    setSelectedFrameVariant(frameId ? ({ _id: frameId } as Variant) : null);
    setSelectedLensVariant(lensId ? ({ _id: lensId } as Variant) : null);
  }, [initial, open]);

  return (
    <ManagementModal
      open={open}
      title={title}
      description="Điền thông tin combo để tạo/cập nhật."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            className="bg-[#2bb6a3]"
            disabled={
              loading ||
              !name.trim() ||
              Number.isNaN(Number(comboPrice)) ||
              Number(comboPrice) < 0 ||
              !String(selectedFrameVariant?._id ?? selectedFrameVariant?.id ?? "").trim() ||
              !String(selectedLensVariant?._id ?? selectedLensVariant?.id ?? "").trim()
            }
            onClick={() => {
              const price = Number(comboPrice);
              const frameVariantId = String(selectedFrameVariant?._id ?? selectedFrameVariant?.id ?? "").trim();
              const lensVariantId = String(selectedLensVariant?._id ?? selectedLensVariant?.id ?? "").trim();
              if (!name.trim() || Number.isNaN(price) || price < 0) {
                toast.error("Tên combo và giá combo hợp lệ là bắt buộc.");
                return;
              }
              if (!frameVariantId || !lensVariantId) {
                toast.error("Vui lòng chọn đầy đủ frame variant và lens variant.");
                return;
              }
              onSubmit({
                name: name.trim(),
                slug: slug.trim() || undefined,
                description: description.trim() || undefined,
                combo_price: price,
                is_active: isActive,
                frame_variant_id: frameVariantId,
                lens_variant_id: lensVariantId,
              });
            }}
          >
            {loading ? "Đang lưu…" : "Tạo combo"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label>Tên combo *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="combo-goi-y-01" />
        </div>
        <div className="space-y-1">
          <Label>Mô tả</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Combo price *</Label>
          <Input type="number" min={0} value={comboPrice} onChange={(e) => setComboPrice(e.target.value)} />
        </div>
        <VariantSelect
          type="frame"
          label="Chọn gọng (frame variant) *"
          value={selectedFrameVariant}
          onChange={setSelectedFrameVariant}
        />
        <VariantSelect
          type="lens"
          label="Chọn tròng (lens variant) *"
          value={selectedLensVariant}
          onChange={setSelectedLensVariant}
        />
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
    </ManagementModal>
  );
}
