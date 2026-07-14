"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth-helpers";

function parseOptionalDate(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

export async function createHorse(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Horse name is required.");

  const horse = await prisma.horse.create({
    data: {
      name,
      breed: String(formData.get("breed") ?? "").trim() || null,
      color: String(formData.get("color") ?? "").trim() || null,
      sex: (String(formData.get("sex") ?? "").trim() || null) as
        | "MARE"
        | "GELDING"
        | "STALLION"
        | null,
      dateOfBirth: parseOptionalDate(formData.get("dateOfBirth")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/horses");
  redirect(`/horses/${horse.id}`);
}

export async function updateHorse(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Horse name is required.");

  await prisma.horse.update({
    where: { id },
    data: {
      name,
      breed: String(formData.get("breed") ?? "").trim() || null,
      color: String(formData.get("color") ?? "").trim() || null,
      sex: (String(formData.get("sex") ?? "").trim() || null) as
        | "MARE"
        | "GELDING"
        | "STALLION"
        | null,
      dateOfBirth: parseOptionalDate(formData.get("dateOfBirth")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath(`/horses/${id}`);
  revalidatePath("/horses");
}

export async function setHorseActive(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  await prisma.horse.update({ where: { id }, data: { active } });

  revalidatePath(`/horses/${id}`);
  revalidatePath("/horses");
}

export async function createCareTask(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const horseId = String(formData.get("horseId") ?? "");
  const type = String(formData.get("type") ?? "");
  const date = String(formData.get("date") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!horseId || !type || !date) {
    throw new Error("Task type and date are required.");
  }

  await prisma.careTask.create({
    data: {
      horseId,
      type: type as
        | "FEEDING"
        | "GROOMING"
        | "TRAINING"
        | "FARRIER"
        | "VET"
        | "TURNOUT"
        | "OTHER",
      date: new Date(date),
      assignedToId,
      notes,
    },
  });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/");
}

export async function toggleCareTaskDone(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const horseId = String(formData.get("horseId") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return;

  const task = await prisma.careTask.findUnique({ where: { id } });
  if (!task) return;
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  if (!isManager && task.assignedToId !== user.id) {
    throw new Error("You can only update tasks assigned to you.");
  }

  await prisma.careTask.update({ where: { id }, data: { done } });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/");
}

export async function deleteCareTask(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const horseId = String(formData.get("horseId") ?? "");
  if (!id) return;

  await prisma.careTask.delete({ where: { id } });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/");
}
