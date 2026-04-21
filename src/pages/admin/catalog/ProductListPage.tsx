import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchProducts } from "@/features/catalog/api";
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
                    <td className="px-4 py-3 text-right">
                      {id ? (
                        <Link
                          to={`/admin/catalog/products/${encodeURIComponent(id)}/variants`}
                          className="font-medium text-teal-600 hover:underline"
                        >
                          Biến thể
                        </Link>
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
    </div>
  );
}
