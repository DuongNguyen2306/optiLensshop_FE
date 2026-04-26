/**
 * Xác định item menu header (Link `to` cố định) có đang trùng route hiện tại hay không.
 * Dùng cho highlight UI — không ảnh hưởng tới điều hướng.
 */
export function isHeaderNavActive(href: string, pathname: string, search: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  const [rawPath, query] = href.split("?");
  const path = rawPath || "/";

  if (path === "/combos") {
    return pathname === "/combos" || pathname.startsWith("/combos/");
  }

  if (path === "/products") {
    if (pathname !== "/products") {
      return false;
    }
    const current = new URLSearchParams(search);
    if (query == null || query === "") {
      return !current.get("type") && !current.get("search");
    }
    const required = new URLSearchParams(query);
    for (const [key, value] of required.entries()) {
      if (current.get(key) !== value) {
        return false;
      }
    }
    return true;
  }

  return false;
}
