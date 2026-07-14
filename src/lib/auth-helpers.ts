import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    redirect("/");
  }
  return user;
}

export function canManage(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}
