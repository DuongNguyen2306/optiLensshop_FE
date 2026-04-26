import { useQuery } from "@tanstack/react-query";
import { getProductVariants } from "@/api/productApi";

export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ["productVariants", productId],
    enabled: Boolean(productId),
    queryFn: () => getProductVariants(productId),
  });
}

