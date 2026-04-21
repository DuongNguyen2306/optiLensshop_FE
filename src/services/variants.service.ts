import axios from "@/lib/axios";
import type { FetchVariantsParams, Variant, VariantsListResponse } from "@/types/variant";

function asArray(data: unknown): Variant[] {
  if (Array.isArray(data)) {
    return data as Variant[];
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return o.items as Variant[];
    }
    if (Array.isArray(o.data)) {
      return o.data as Variant[];
    }
    if (Array.isArray(o.variants)) {
      return o.variants as Variant[];
    }
  }
  return [];
}

export async function fetchVariants(params: FetchVariantsParams): Promise<VariantsListResponse> {
  const query: Record<string, string | number> = {
    type: params.type,
    limit: params.limit ?? 20,
  };
  if (typeof params.page === "number") {
    query.page = params.page;
  }
  const s = params.search?.trim();
  if (s) {
    query.search = s;
  }

  const { data } = await axios.get<unknown>("/variants", { params: query });

  let pagination: VariantsListResponse["pagination"] | undefined;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const pg = o.pagination;
    if (pg && typeof pg === "object") {
      pagination = pg as VariantsListResponse["pagination"];
    }
  }

  return { items: asArray(data), pagination };
}

