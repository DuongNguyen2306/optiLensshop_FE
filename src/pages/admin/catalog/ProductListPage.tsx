import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ManagementModal from "@/components/admin/ManagementModal";
import {
  deleteProduct,
  fetchProducts,
  toggleActiveProduct,
  updateProduct,
} from "@/features/catalog/api";
import type { Product } from "@/features/catalog/types";
import { entityId } from "@/features/catalog/types";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductListPage() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { list: items } = await fetchProducts({
        page,
        limit,
        search: search.trim() || undefined,
        category_id: categoryId.trim() || undefined,
      });
      setList(items);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được danh sách sản phẩm."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const onDeleteProduct = async (product: Product) => {
    const id = entityId(product);
    if (!id) {
      toast.error("Thiếu product ID.");
      return;
    }
    try {
      setDeleting(true);
      await deleteProduct(id);
      toast.success("Đã xóa sản phẩm.");
      setDeleteProductTarget(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể xóa sản phẩm."));
    } finally {
      setDeleting(false);
    }
  };

  const onToggleActive = async (product: Product) => {
    const id = entityId(product);
    if (!id) {
      toast.error("Thiếu product ID.");
      return;
    }
    const nextActive = !Boolean((product as Record<string, unknown>).active);
    try {
      setTogglingId(id);
      await toggleActiveProduct(id, nextActive);
      toast.success(nextActive ? "Đã hiển thị sản phẩm." : "Đã ẩn sản phẩm.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể đổi trạng thái active."));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sản phẩm</h1>
          <p className="text-sm text-slate-500">Danh sách (public API). Tạo mới: multipart.</p>
        </div>
        <Link
          to="/admin/catalog/products/new"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
        >
          + Tạo sản phẩm
        </Link>
      </div>

      <form onSubmit={onSearch} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="q">Tìm kiếm</Label>
          <Input id="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, SKU…" />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="cat">category_id</Label>
          <Input id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Mongo ObjectId" />
        </div>
        <Button type="submit">Lọc</Button>
      </form>

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const id = entityId(p);
                return (
                  <tr key={id || (p.slug as string)} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">{id || "—"}</td>
                    <td className="px-4 py-3 font-medium">{p.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.slug ?? "—"}</td>
                    <td className="px-4 py-3">{String(p.type ?? "—")}</td>
                    <td className="px-4 py-3">{Boolean((p as Record<string, unknown>).active) ? "Hiện" : "Ẩn"}</td>
                    <td className="px-4 py-3 text-right">
                      {id ? (
                        <div className="inline-flex items-center gap-2">
                          <Button type="button" variant="ghost" className="text-[#2bb6a3]" onClick={() => setEditProduct(p)}>
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-indigo-600"
                            disabled={togglingId === id}
                            onClick={() => void onToggleActive(p)}
                          >
                            {togglingId === id ? "..." : "Ẩn/Hiện"}
                          </Button>
                          <Button type="button" variant="ghost" className="text-red-600" onClick={() => setDeleteProductTarget(p)}>
                            Xóa
                          </Button>
                          <Link
                            to={`/admin/catalog/products/${encodeURIComponent(id)}/variants`}
                            className="font-medium text-teal-600 hover:underline"
                          >
                            Biến thể
                          </Link>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 ? <p className="p-6 text-center text-slate-500">Không có dữ liệu.</p> : null}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
          Trang trước
        </Button>
        <Button type="button" variant="outline" disabled={loading || list.length < limit} onClick={() => setPage((p) => p + 1)}>
          Trang sau
        </Button>
        <span className="self-center text-sm text-slate-500">Trang {page}</span>
      </div>

      {editProduct ? (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={async (payload) => {
            const id = entityId(editProduct);
            if (!id) {
              toast.error("Thiếu product ID.");
              return;
            }
            try {
              await updateProduct(id, payload);
              toast.success("Cập nhật sản phẩm thành công.");
              setEditProduct(null);
              await load();
            } catch (e) {
              toast.error(getApiErrorMessage(e, "Không thể cập nhật sản phẩm."));
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteProductTarget}
        title="Xóa sản phẩm?"
        description={deleteProductTarget ? `Sản phẩm: ${deleteProductTarget.name ?? entityId(deleteProductTarget)}` : undefined}
        loading={deleting}
        onCancel={() => setDeleteProductTarget(null)}
        onConfirm={() => {
          if (deleteProductTarget) {
            void onDeleteProduct(deleteProductTarget);
          }
        }}
      />
    </div>
  );
}

function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (
    payload: Partial<{
      name: string;
      type: "frame" | "lens" | "accessory";
      category: string;
      brand: string;
      model: string;
      material: string;
      description: string;
    }>
  ) => void;
}) {
  const [name, setName] = useState(String(product.name ?? ""));
  const [type, setType] = useState(String(product.type ?? ""));
  const [category, setCategory] = useState(String((product as Record<string, unknown>).category ?? ""));
  const [brand, setBrand] = useState(String((product as Record<string, unknown>).brand ?? ""));
  const [model, setModel] = useState(String((product as Record<string, unknown>).model ?? ""));
  const [material, setMaterial] = useState(String((product as Record<string, unknown>).material ?? ""));
  const [description, setDescription] = useState(String((product as Record<string, unknown>).description ?? ""));

  useEffect(() => {
    setName(String(product.name ?? ""));
    setType(String(product.type ?? ""));
    setCategory(String((product as Record<string, unknown>).category ?? ""));
    setBrand(String((product as Record<string, unknown>).brand ?? ""));
    setModel(String((product as Record<string, unknown>).model ?? ""));
    setMaterial(String((product as Record<string, unknown>).material ?? ""));
    setDescription(String((product as Record<string, unknown>).description ?? ""));
  }, [product]);

  return (
    <ManagementModal
      open
      title="Sửa sản phẩm"
      description={String(product.slug ?? entityId(product))}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            className="bg-[#2bb6a3]"
            onClick={() =>
              onSaved({
                name: name.trim() || undefined,
                type: (type.trim() || undefined) as "frame" | "lens" | "accessory" | undefined,
                category: category.trim() || undefined,
                brand: brand.trim() || undefined,
                model: model.trim() || undefined,
                material: material.trim() || undefined,
                description: description.trim() || undefined,
              })
            }
          >
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label>Tên</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">—</option>
            <option value="frame">frame</option>
            <option value="lens">lens</option>
            <option value="accessory">accessory</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Category ID</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Brand ID</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Model ID</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Material</Label>
          <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </ManagementModal>
  );
}
