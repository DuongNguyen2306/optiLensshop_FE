export interface Combo {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  combo_price?: number;
  is_active?: boolean;
  active?: boolean;
  frame_variant_id?: string | Record<string, unknown>;
  lens_variant_id?: string | Record<string, unknown>;
  [key: string]: unknown;
}

export interface ComboListResponse {
  items: Combo[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface ComboMutationBody {
  name: string;
  slug?: string;
  description?: string;
  combo_price: number;
  is_active?: boolean;
  frame_variant_id?: string;
  lens_variant_id?: string;
}
