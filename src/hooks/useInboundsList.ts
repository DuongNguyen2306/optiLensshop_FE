import { useQuery } from "@tanstack/react-query";
import { getInbounds } from "@/api/inboundApi";
import type { InboundListQuery } from "@/types/inbound";

export function useInboundsList(params: InboundListQuery) {
  return useQuery({
    queryKey: ["inbounds", "list", params],
    queryFn: () => getInbounds(params),
  });
}

