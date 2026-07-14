"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { redirect } from "@/i18n/navigation";

export async function createCompetition(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  if (!name || !startDate) throw new Error("Name and start date are required.");

  const endDateRaw = String(formData.get("endDate") ?? "").trim();

  const competition = await prisma.competition.create({
    data: {
      name,
      location: String(formData.get("location") ?? "").trim() || null,
      startDate: new Date(startDate),
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/competitions");
  revalidatePath("/calendar");
  const locale = await getLocale();
  redirect({ href: `/competitions/${competition.id}`, locale });
}

export async function deleteCompetition(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.competition.delete({ where: { id } });

  revalidatePath("/competitions");
  const locale = await getLocale();
  redirect({ href: "/competitions", locale });
}

export async function addEntry(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const competitionId = String(formData.get("competitionId") ?? "");
  const horseId = String(formData.get("horseId") ?? "");
  if (!competitionId || !horseId) throw new Error("Horse is required.");

  await prisma.competitionEntry.create({
    data: {
      competitionId,
      horseId,
      riderId: String(formData.get("riderId") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
    },
  });

  revalidatePath(`/competitions/${competitionId}`);
}

export async function updateEntryResult(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const id = String(formData.get("id") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "");
  const result = String(formData.get("result") ?? "").trim() || null;
  if (!id) return;

  await prisma.competitionEntry.update({ where: { id }, data: { result } });

  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeEntry(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "");
  if (!id) return;

  await prisma.competitionEntry.delete({ where: { id } });

  revalidatePath(`/competitions/${competitionId}`);
}
