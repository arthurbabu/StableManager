"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function createStaffAccount(formData: FormData) {
  await requireRole(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "STAFF");

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email and an 8+ character password are required.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as "ADMIN" | "MANAGER" | "STAFF",
    },
  });

  revalidatePath("/admin/users");
}

export async function setUserActive(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  await prisma.user.update({ where: { id }, data: { active } });

  revalidatePath("/admin/users");
}

export async function setUserRole(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !role) return;

  await prisma.user.update({
    where: { id },
    data: { role: role as "ADMIN" | "MANAGER" | "STAFF" },
  });

  revalidatePath("/admin/users");
}
