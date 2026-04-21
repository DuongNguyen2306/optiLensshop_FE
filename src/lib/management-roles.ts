/** Staff API: manager hoặc admin. */
export function canAccessStaffManagement(role: string | undefined | null): boolean {
  const r = role?.toLowerCase();
  return r === "manager" || r === "admin";
}

/** Managers API: chỉ admin. */
export function canAccessManagersManagement(role: string | undefined | null): boolean {
  return role?.toLowerCase() === "admin";
}
