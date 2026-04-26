import { useQuery } from "@tanstack/react-query";
import { getInboundById } from "@/api/inboundApi";

export function useInboundDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["inbounds", "detail", id],
    queryFn: () => getInboundById(id as string),
    enabled: Boolean(id),
  });
}

