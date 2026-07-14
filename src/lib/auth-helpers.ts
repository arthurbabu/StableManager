import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export async function requireUser() {
  const session = await auth();
  if (session?.user) return session.user;

  const locale = await getLocale();
  return redirect({ href: "/login", locale });
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    const locale = await getLocale();
    redirect({ href: "/", locale });
  }
  return user;
}

export function canManage(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}
