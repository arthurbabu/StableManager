import { addDays, addWeeks, endOfDay, endOfWeek, format, isWithinInterval, startOfDay, startOfWeek } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { PageHeader, LinkButton } from "@/components/ui";
import { CalendarInteractive } from "./CalendarInteractive";

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const params = await searchParams;
  const t = await getTranslations("Calendar");
  const locale = await getLocale();
  const dateLocale = getDateFnsLocale(locale);

  const anchor = params.week ? new Date(params.week) : new Date();
  const today = new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [shifts, careTasks, vacations, competitions, staff, horses, reminderSources] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: { user: true },
    }),
    prisma.careTask.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: { horse: true, assignedTo: true },
    }),
    prisma.vacationRequest.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
      include: { user: true },
    }),
    prisma.competition.findMany({
      where: {
        OR: [
          { startDate: { lte: weekEnd }, endDate: { gte: weekStart } },
          { endDate: null, startDate: { gte: weekStart, lte: weekEnd } },
        ],
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.horse.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // reminderDelayDays is an offset from a source task's own `date`, which
    // could be from any point in the past, so this can't be bounded by the
    // visible week the way the other queries are — the due date only gets
    // computed (and matched against the week) below.
    prisma.careTask.findMany({
      where: { type: "VET", reminderDelayDays: { not: null } },
      include: { horse: true, assignedTo: true },
    }),
  ]);

  const shiftsByDay: Record<string, typeof shifts> = {};
  const tasksByDay: Record<string, typeof careTasks> = {};
  const vacationsByDay: Record<string, typeof vacations> = {};
  const competitionsByDay: Record<string, typeof competitions> = {};
  for (const d of days) {
    shiftsByDay[dayKey(d)] = [];
    tasksByDay[dayKey(d)] = [];
    vacationsByDay[dayKey(d)] = [];
    competitionsByDay[dayKey(d)] = [];
  }

  for (const s of shifts) shiftsByDay[dayKey(s.date)]?.push(s);
  for (const task of careTasks) tasksByDay[dayKey(task.date)]?.push(task);
  for (const day of days) {
    for (const v of vacations) {
      if (isWithinInterval(day, { start: startOfDay(v.startDate), end: endOfDay(v.endDate) })) {
        vacationsByDay[dayKey(day)]?.push(v);
      }
    }
    for (const c of competitions) {
      if (isWithinInterval(day, { start: startOfDay(c.startDate), end: endOfDay(c.endDate ?? c.startDate) })) {
        competitionsByDay[dayKey(day)]?.push(c);
      }
    }
  }

  const suggestionsByDay: Record<
    string,
    {
      key: string;
      horseId: string;
      horseName: string;
      type: (typeof reminderSources)[number]["type"];
      assignedToId: string | null;
      notes: string | null;
    }[]
  > = {};
  for (const d of days) suggestionsByDay[dayKey(d)] = [];

  for (const source of reminderSources) {
    if (source.reminderDelayDays == null) continue;
    const dueKey = dayKey(addDays(source.date, source.reminderDelayDays));
    if (!(dueKey in suggestionsByDay)) continue; // due date outside the visible week

    // Skip if a real task of the same type already exists for this horse on
    // the due date — the reminder's already been acted on.
    const alreadyFulfilled = careTasks.some(
      (t) => t.horseId === source.horseId && t.type === source.type && dayKey(t.date) === dueKey,
    );
    if (alreadyFulfilled) continue;

    suggestionsByDay[dueKey].push({
      key: source.id,
      horseId: source.horseId,
      horseName: source.horse.name,
      type: source.type,
      assignedToId: source.assignedToId,
      notes: source.notes,
    });
  }

  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const todayKey = dayKey(today);
  const anchorKey = dayKey(anchor);

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("dateRange", {
          start: format(weekStart, "d MMM", { locale: dateLocale }),
          end: format(weekEnd, "d MMM yyyy", { locale: dateLocale }),
        })}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/calendar?week=${prevWeek}`} variant="secondary">
              {t("prev")}
            </LinkButton>
            <LinkButton href="/calendar" variant="secondary">
              {t("today")}
            </LinkButton>
            <LinkButton href={`/calendar?week=${nextWeek}`} variant="secondary">
              {t("next")}
            </LinkButton>
          </div>
        }
      />

      <CalendarInteractive
        days={days}
        shiftsByDay={shiftsByDay}
        tasksByDay={tasksByDay}
        vacationsByDay={vacationsByDay}
        competitionsByDay={competitionsByDay}
        suggestionsByDay={suggestionsByDay}
        staff={staff}
        horses={horses}
        isManager={isManager}
        todayKey={todayKey}
        defaultDateKey={anchorKey}
      />
    </div>
  );
}
