import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { ProductVariant } from "@/types/product";
import { mapVariantApiError } from "@/utils/errorMapper";
import { buildVariantFormData } from "@/features/products/variants/buildVariantFormData";
import { useProductVariants } from "@/features/products/variants/useProductVariants";
import { useVariantMutations } from "@/features/products/variants/useVariantMutations";
import VariantFormModal from "@/features/products/variants/VariantFormModal";
import VariantList from "@/features/products/variants/VariantList";

export default function ProductVariantsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [deleteVariant, setDeleteVariant] = useState<ProductVariant | null>(null);
  const [skuFieldError, setSkuFieldError] = useState<string | undefined>(undefined);

  if (!productId) {
    return <p>Thiếu productId.</p>;
  }

  const variantsQuery = useProductVariants(productId);
  const { createMutation, updateMutation, deleteMutation } = useVariantMutations(productId);
  const items = variantsQuery.data ?? [];

  const saveLoading = createMutation.isPending || updateMutation.isPending;
  const parsedListError = variantsQuery.error ? mapVariantApiError(variantsQuery.error).message : null;
  const deleteWarning = useMemo(() => "Thao tác này có thể chuyển biến thể sang trạng thái ẩn nếu còn tồn kho.", []);

  return (
    <div>
      <Link to="/admin/catalog/products" className="text-sm text-teal-600 hover:underline">
        ← Sản phẩm
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Biến thể sản phẩm</h1>
      <p className="text-sm text-slate-500">Product ID: {productId}</p>
      <div className="mt-3">
        <Button type="button" className="bg-[#2bb6a3]" onClick={() => { setSkuFieldError(undefined); setCreateOpen(true); }}>
          Thêm biến thể
        </Button>
      </div>

      <VariantList
        items={items}
        loading={variantsQuery.isPending}
        error={parsedListError}
        onRetry={() => variantsQuery.refetch()}
        onCreate={() => { setSkuFieldError(undefined); setCreateOpen(true); }}
        onEdit={(variant) => { setSkuFieldError(undefined); setEditVariant(variant); }}
        onDelete={(variant) => setDeleteVariant(variant)}
        onInbound={(variant) => {
          const variantId = String(variant._id ?? variant.id ?? "").trim();
          if (!variantId) {
            toast.error("Thiếu thông tin variant để tạo phiếu nhập.");
            return;
          }
          navigate(`/admin/inventory/receipts?variant_id=${encodeURIComponent(variantId)}&open_create=1`);
        }}
      />

      <VariantFormModal
        open={createOpen}
        mode="create"
        loading={saveLoading}
        fieldErrorSku={skuFieldError}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => {
          setSkuFieldError(undefined);
          const formData = buildVariantFormData(payload);
          createMutation.mutate(formData, {
            onSuccess: () => {
              toast.success("Đã thêm biến thể.");
              setCreateOpen(false);
            },
            onError: (error) => {
              const mapped = mapVariantApiError(error);
              if (mapped.fieldErrors?.sku) setSkuFieldError(mapped.fieldErrors.sku);
              toast.error(mapped.message);
            },
          });
        }}
      />

      <VariantFormModal
        open={Boolean(editVariant)}
        mode="edit"
        initial={editVariant}
        loading={saveLoading}
        fieldErrorSku={skuFieldError}
        onClose={() => setEditVariant(null)}
        onSubmit={(payload) => {
          if (!editVariant) return;
          const variantId = String(editVariant._id ?? editVariant.id ?? "");
          if (!variantId) {
            toast.error("Thiếu thông tin variant.");
            return;
          }
          setSkuFieldError(undefined);
          const formData = buildVariantFormData(payload);
          updateMutation.mutate(
            { variantId, payloadFormData: formData },
            {
              onSuccess: () => {
                toast.success("Đã cập nhật biến thể.");
                setEditVariant(null);
              },
              onError: (error) => {
                const mapped = mapVariantApiError(error);
                if (mapped.fieldErrors?.sku) setSkuFieldError(mapped.fieldErrors.sku);
                toast.error(mapped.message);
              },
            }
          );
        }}
      />

      <ConfirmDialog
        open={!!deleteVariant}
        title="Xóa biến thể?"
        description={
          deleteVariant ? (
            <div>
              <p>SKU: {String(deleteVariant.sku ?? "—")}</p>
              <p className="mt-1 text-xs text-slate-500">{deleteWarning}</p>
            </div>
          ) : undefined
        }
        loading={deleteMutation.isPending}
        confirmLabel="Xóa"
        onCancel={() => setDeleteVariant(null)}
        onConfirm={() => {
          if (!deleteVariant) {
            return;
          }
          const variantId = String(deleteVariant._id ?? deleteVariant.id ?? "");
          if (!variantId) {
            toast.error("Thiếu thông tin variant.");
            return;
          }
          deleteMutation.mutate(variantId, {
            onSuccess: (res) => {
              if (res?.soft_disabled) {
                toast.warning("Biến thể còn tồn kho hoặc đang giữ chỗ, đã chuyển sang trạng thái ẩn");
              } else {
                toast.success("Đã xóa biến thể.");
              }
              setDeleteVariant(null);
            },
            onError: (error) => {
              toast.error(mapVariantApiError(error).message);
            },
          });
        }}
      />
    </div>
  );
}
