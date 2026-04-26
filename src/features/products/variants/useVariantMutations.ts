import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVariant, deleteVariant, updateVariant } from "@/api/productApi";

export function useVariantMutations(productId: string) {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["productVariants", productId] });
  };

  const createMutation = useMutation({
    mutationFn: (payloadFormData: FormData) => createVariant(productId, payloadFormData),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, payloadFormData }: { variantId: string; payloadFormData: FormData }) =>
      updateVariant(productId, variantId, payloadFormData),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(productId, variantId),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}

