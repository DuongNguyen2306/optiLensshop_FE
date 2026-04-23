export type UserRole = "customer" | "sales" | "operations" | "manager" | "admin";

export function normalizeRole(role: string | undefined | null): UserRole | null {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "operation") {
    return "operations";
  }
  if (r === "staff") {
    return "sales";
  }
  if (r === "customer" || r === "sales" || r === "operations" || r === "manager" || r === "admin") {
    return r;
  }
  return null;
}

export function isInternalRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === "sales" || r === "operations" || r === "manager" || r === "admin";
}

export function isCustomerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === "customer";
}

export function roleDefaultPath(role: string | undefined | null): string {
  const r = normalizeRole(role);
  if (r === "operations" || r === "sales") {
    return "/admin/orders";
  }
  if (r === "manager" || r === "admin") {
    return "/admin/dashboard";
  }
  return "/";
}
