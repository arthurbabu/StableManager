"use server";

import { revalidatePath } from "next/cache";
import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function setTaskTypeColor(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const type = String(formData.get("type") ?? "");
  const color = String(formData.get("color") ?? "").trim();
  if (!type || !HEX_COLOR_PATTERN.test(color)) {
    throw new Error("A valid task type and hex color are required.");
  }

  await prisma.taskTypeColor.upsert({
    where: { type: type as TaskType },
    update: { color },
    create: { type: type as TaskType, color },
  });

  revalidatePath("/settings/colors");
  revalidatePath("/calendar");
}

export async function resetTaskTypeColor(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const type = String(formData.get("type") ?? "");
  if (!type) return;

  await prisma.taskTypeColor.deleteMany({ where: { type: type as TaskType } });

  revalidatePath("/settings/colors");
  revalidatePath("/calendar");
}
