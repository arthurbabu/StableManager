"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function createShift(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const userId = String(formData.get("userId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!userId || !date || !startTime || !endTime) {
    throw new Error("Missing required shift fields.");
  }

  await prisma.shift.create({
    data: {
      userId,
      date: new Date(date),
      startTime,
      endTime,
      notes,
    },
  });

  revalidatePath("/staff");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateShift(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const id = String(formData.get("id") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !userId || !date || !startTime || !endTime) {
    throw new Error("Missing required shift fields.");
  }

  await prisma.shift.update({
    where: { id },
    data: {
      userId,
      date: new Date(date),
      startTime,
      endTime,
      notes,
    },
  });

  revalidatePath("/staff");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteShift(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.shift.delete({ where: { id } });

  revalidatePath("/staff");
  revalidatePath("/calendar");
  revalidatePath("/");
}
