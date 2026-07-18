"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth-helpers";
import { redirect } from "@/i18n/navigation";

function parseOptionalDate(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

function parseOptionalInt(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseInt(str, 10);
  return Number.isFinite(n) ? n : null;
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
      sireNumber: String(formData.get("sireNumber") ?? "").trim() || null,
      transponderNumber: String(formData.get("transponderNumber") ?? "").trim() || null,
      ownerName: String(formData.get("ownerName") ?? "").trim() || null,
      ownerContact: String(formData.get("ownerContact") ?? "").trim() || null,
    },
  });

  revalidatePath("/horses");
  const locale = await getLocale();
  redirect({ href: `/horses/${horse.id}`, locale });
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
      sireNumber: String(formData.get("sireNumber") ?? "").trim() || null,
      transponderNumber: String(formData.get("transponderNumber") ?? "").trim() || null,
      ownerName: String(formData.get("ownerName") ?? "").trim() || null,
      ownerContact: String(formData.get("ownerContact") ?? "").trim() || null,
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
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const endTime = String(formData.get("endTime") ?? "").trim() || null;
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const reminderDelayDays = parseOptionalInt(formData.get("reminderDelayDays"));
  const repeatUntilRaw = String(formData.get("repeatUntil") ?? "").trim();

  if (!horseId || !type || !date) {
    throw new Error("Task type and date are required.");
  }

  const startDate = new Date(date);
  const occurrenceDates = [startDate];

  if (repeatUntilRaw) {
    const until = new Date(repeatUntilRaw);
    if (until > startDate) {
      const MAX_OCCURRENCES = 180; // ~6 months of daily repeats, a sane upper bound
      occurrenceDates.length = 0;
      const cursor = new Date(startDate);
      while (cursor <= until && occurrenceDates.length < MAX_OCCURRENCES) {
        occurrenceDates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  await prisma.careTask.createMany({
    data: occurrenceDates.map((occurrenceDate) => ({
      horseId,
      type: type as TaskType,
      date: occurrenceDate,
      startTime,
      endTime,
      assignedToId,
      notes,
      location,
      reminderDelayDays,
    })),
  });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateCareTask(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const id = String(formData.get("id") ?? "");
  const horseId = String(formData.get("horseId") ?? "");
  const type = String(formData.get("type") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const endTime = String(formData.get("endTime") ?? "").trim() || null;
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const reminderDelayDays = parseOptionalInt(formData.get("reminderDelayDays"));

  if (!id || !horseId || !type || !date) {
    throw new Error("Task type and date are required.");
  }

  await prisma.careTask.update({
    where: { id },
    data: {
      horseId,
      type: type as TaskType,
      date: new Date(date),
      startTime,
      endTime,
      assignedToId,
      notes,
      location,
      reminderDelayDays,
    },
  });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/calendar");
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
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteCareTask(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const horseId = String(formData.get("horseId") ?? "");
  if (!id) return;

  await prisma.careTask.delete({ where: { id } });

  revalidatePath(`/horses/${horseId}`);
  revalidatePath("/calendar");
  revalidatePath("/");
}
