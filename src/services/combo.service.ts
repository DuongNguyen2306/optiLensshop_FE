import axios from "@/lib/axios";
import type { Combo, ComboListResponse, ComboMutationBody } from "@/types/combo";

function asComboArray(data: unknown): Combo[] {
  if (Array.isArray(data)) {
    return data as Combo[];
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return o.items as Combo[];
    }
    if (Array.isArray(o.data)) {
      return o.data as Combo[];
    }
    if (Array.isArray(o.combos)) {
      return o.combos as Combo[];
    }
  }
  return [];
}

export async function fetchCombos(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}): Promise<ComboListResponse> {
  const { data } = await axios.get<unknown>("/combos", { params });
  let pagination: ComboListResponse["pagination"] | undefined;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const pg = o.pagination;
    if (pg && typeof pg === "object") {
      pagination = pg as ComboListResponse["pagination"];
    }
  }
  return { items: asComboArray(data), pagination };
}

export async function fetchComboBySlug(slug: string): Promise<Combo | null> {
  const { data } = await axios.get<unknown>(`/combos/${encodeURIComponent(slug)}`);
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (o.combo && typeof o.combo === "object") {
      return o.combo as Combo;
    }
    return data as Combo;
  }
  return null;
}

export async function createCombo(body: ComboMutationBody) {
  const { data } = await axios.post<unknown>("/combos", body);
  return data;
}

export async function updateCombo(id: string, body: Partial<ComboMutationBody>) {
  const { data } = await axios.put<unknown>(`/combos/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteCombo(id: string) {
  const { data } = await axios.delete<unknown>(`/combos/${encodeURIComponent(id)}`);
  return data;
}
