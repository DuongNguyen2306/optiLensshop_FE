/** Role được phép gọi API quản trị catalog (khớp BE). */
export const CATALOG_ADMIN_ROLES = ["manager", "admin"] as const;

export type CatalogAdminRole = (typeof CATALOG_ADMIN_ROLES)[number];

export function canManageCatalog(role: string | undefined | null): role is CatalogAdminRole {
  if (!role) {
    return false;
  }
  const r = role.toLowerCase();
  return r === "manager" || r === "admin";
}
