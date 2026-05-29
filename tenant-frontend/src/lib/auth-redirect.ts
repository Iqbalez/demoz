import type { UserRole } from "@/context/AuthContext";

export function getPostLoginPath(role: UserRole, next?: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  if (role === "SUPER_ADMIN") {
    return "/admin-portal";
  }
  return "/dashboard";
}
