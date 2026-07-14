"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth-helpers";

export async function requestVacation(formData: FormData) {
  const user = await requireUser();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!startDate || !endDate) {
    throw new Error("Start and end date are required.");
  }
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("End date must be after start date.");
  }

  await prisma.vacationRequest.create({
    data: {
      userId: user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  });

  revalidatePath("/staff/vacations");
  revalidatePath("/");
}

export async function reviewVacation(formData: FormData) {
  const reviewer = await requireRole(["ADMIN", "MANAGER"]);

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    throw new Error("Invalid review decision.");
  }

  await prisma.vacationRequest.update({
    where: { id },
    data: { status: decision, reviewedById: reviewer.id },
  });

  revalidatePath("/staff/vacations");
  revalidatePath("/");
}

export async function cancelVacation(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return;
  if (request.userId !== user.id && user.role !== "ADMIN") {
    throw new Error("You can only cancel your own requests.");
  }

  await prisma.vacationRequest.delete({ where: { id } });

  revalidatePath("/staff/vacations");
  revalidatePath("/");
}
