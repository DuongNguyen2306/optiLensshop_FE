import axios from "@/lib/axios";
import type { Brand, CatalogModel, Category, Product, ProductType, ProductVariantInput } from "@/features/catalog/types";
import type { ProductDetailPayload, ShopVariant } from "@/types/shop";

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return o.items as T[];
    }
    if (Array.isArray(o.data)) {
      return o.data as T[];
    }
    if (Array.isArray(o.products)) {
      return o.products as T[];
    }
    if (Array.isArray(o.categories)) {
      return o.categories as T[];
    }
    if (Array.isArray(o.brands)) {
      return o.brands as T[];
    }
    if (Array.isArray(o.models)) {
      return o.models as T[];
    }
  }
  return [];
}

export async function fetchProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
}) {
  const { data } = await axios.get<unknown>("/products", { params });
  return { list: asArray<Product>(data), raw: data };
}

/** GET /products/:slug — BE thường trả { product, variants }. */
export async function fetchProductDetailBySlug(slug: string): Promise<ProductDetailPayload> {
  const { data } = await axios.get<unknown>(`/products/${encodeURIComponent(slug)}`);
  if (data && typeof data === "object" && "product" in data) {
    const o = data as { product: Product; variants?: unknown };
    const productRecord = (o.product ?? {}) as Record<string, unknown>;
    const rootVariants = Array.isArray(o.variants) ? (o.variants as ShopVariant[]) : [];
    const embeddedVariants = Array.isArray(productRecord.variants) ? (productRecord.variants as ShopVariant[]) : [];
    const variants = rootVariants.length > 0 ? rootVariants : embeddedVariants;
    return { product: o.product, variants };
  }
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const variants = Array.isArray(rec.variants) ? (rec.variants as ShopVariant[]) : [];
    return { product: data as Product, variants };
  }
  return { product: data as Product, variants: [] };
}

/** @deprecated Dùng fetchProductDetailBySlug khi cần cả variants */
export async function fetchProductBySlug(slug: string) {
  const { product } = await fetchProductDetailBySlug(slug);
  return product;
}

export async function fetchProductVariants(productId: string) {
  const { data } = await axios.get<unknown>(`/products/${encodeURIComponent(productId)}/variants`);
  return asArray<ProductVariantInput & { _id?: string }>(data);
}

export async function createProductMultipart(payload: {
  category: string;
  name: string;
  variants: string;
  images: File[];
  type?: ProductType;
  brand?: string;
  model?: string;
  material?: string;
  description?: string;
}) {
  const fd = new FormData();
  fd.append("category", payload.category);
  fd.append("name", payload.name);
  fd.append("variants", payload.variants);
  payload.images.forEach((file) => fd.append("images", file));
  if (payload.type) {
    fd.append("type", payload.type);
  }
  if (payload.brand) {
    fd.append("brand", payload.brand);
  }
  if (payload.model) {
    fd.append("model", payload.model);
  }
  if (payload.material) {
    fd.append("material", payload.material);
  }
  if (payload.description) {
    fd.append("description", payload.description);
  }
  const { data } = await axios.post<unknown>("/products", fd);
  return data;
}

export async function createProductVariant(productId: string, body: ProductVariantInput) {
  const { data } = await axios.post<unknown>(`/products/${encodeURIComponent(productId)}/variants`, body);
  return data;
}

export async function updateProduct(
  id: string,
  body: Partial<{
    name: string;
    type: ProductType;
    category: string;
    brand: string;
    model: string;
    material: string;
    description: string;
  }>
) {
  const { data } = await axios.put<unknown>(`/products/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteProduct(id: string) {
  const { data } = await axios.delete<unknown>(`/products/${encodeURIComponent(id)}`);
  return data;
}

export async function toggleActiveProduct(id: string, active: boolean) {
  const { data } = await axios.patch<unknown>(`/products/${encodeURIComponent(id)}/active`, { active });
  return data;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  body: Partial<ProductVariantInput>
) {
  const { data } = await axios.put<unknown>(
    `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    body
  );
  return data;
}

export async function deleteProductVariant(productId: string, variantId: string) {
  const { data } = await axios.delete<unknown>(
    `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`
  );
  return data;
}

export async function fetchCategories() {
  const { data } = await axios.get<unknown>("/categories");
  return asArray<Category>(data);
}

export async function createCategory(body: { name: string; slug: string; parent_id?: string | null }) {
  const { data } = await axios.post<unknown>("/categories", body);
  return data;
}

export async function updateCategory(id: string, body: { name?: string; slug?: string; parent_id?: string | null }) {
  const { data } = await axios.put<unknown>(`/categories/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteCategory(id: string) {
  const { data } = await axios.delete<unknown>(`/categories/${encodeURIComponent(id)}`);
  return data;
}

export async function fetchBrands() {
  const { data } = await axios.get<unknown>("/brands");
  return asArray<Brand>(data);
}

export async function createBrand(body: { name: string; description?: string; logo?: string }) {
  const { data } = await axios.post<unknown>("/brands", body);
  return data;
}

export async function updateBrand(id: string, body: { name?: string; description?: string; logo?: string }) {
  const { data } = await axios.put<unknown>(`/brands/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteBrand(id: string) {
  const { data } = await axios.delete<unknown>(`/brands/${encodeURIComponent(id)}`);
  return data;
}

export async function fetchModels() {
  const { data } = await axios.get<unknown>("/models");
  return asArray<CatalogModel>(data);
}

export async function createModel(body: { name: string; type: CatalogModel["type"]; description?: string }) {
  const { data } = await axios.post<unknown>("/models", body);
  return data;
}

export async function updateModel(id: string, body: { name?: string; type?: CatalogModel["type"]; description?: string }) {
  const { data } = await axios.put<unknown>(`/models/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteModel(id: string) {
  const { data } = await axios.delete<unknown>(`/models/${encodeURIComponent(id)}`);
  return data;
}
