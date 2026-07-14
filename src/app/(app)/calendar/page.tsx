import Link from "next/link";
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, LinkButton } from "@/components/ui";

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 48; // px
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Position on the grid in px, clamped to the visible hour range. */
function toGridPx(minutesSinceMidnight: number) {
  const relative = minutesSinceMidnight - START_HOUR * 60;
  const clamped = Math.min(Math.max(relative, 0), TOTAL_MINUTES);
  return (clamped / 60) * HOUR_HEIGHT;
}

type ShiftWithUser = {
  id: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  user: { name: string };
};

type PositionedShift = ShiftWithUser & {
  top: number;
  height: number;
  col: number;
  colCount: number;
};

/**
 * Lays out overlapping shifts side-by-side within collision clusters
 * (a Google Calendar / Doctolib style day-grid layout), instead of the
 * naive "one column per shift" approach which wastes width when shifts
 * don't actually overlap.
 */
function layoutShifts(shifts: ShiftWithUser[]): PositionedShift[] {
  const sorted = [...shifts].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime),
  );

  const result: PositionedShift[] = [];
  let cluster: { shift: ShiftWithUser; start: number; end: number }[] = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const placed: { shift: ShiftWithUser; start: number; end: number; col: number }[] = [];
    for (const item of cluster) {
      let col = colEnds.findIndex((end) => end <= item.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(item.end);
      } else {
        colEnds[col] = item.end;
      }
      placed.push({ ...item, col });
    }
    const colCount = colEnds.length;
    for (const p of placed) {
      const top = toGridPx(p.start);
      const height = Math.max(toGridPx(p.end) - top, 22);
      result.push({ ...p.shift, top, height, col: p.col, colCount });
    }
    cluster = [];
    clusterMaxEnd = -Infinity;
  };

  for (const s of sorted) {
    const start = toMinutes(s.startTime);
    const end = Math.max(toMinutes(s.endTime), start + 15);
    if (cluster.length > 0 && start >= clusterMaxEnd) flush();
    cluster.push({ shift: s, start, end });
    clusterMaxEnd = Math.max(clusterMaxEnd, end);
  }
  flush();

  return result;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const params = await searchParams;

  const anchor = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [shifts, careTasks, vacations, competitions] = await Promise.all([
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
  ]);

  const shiftsByDay = new Map(days.map((d) => [dayKey(d), [] as typeof shifts]));
  for (const s of shifts) shiftsByDay.get(dayKey(s.date))?.push(s);

  const tasksByDay = new Map(days.map((d) => [dayKey(d), [] as typeof careTasks]));
  for (const t of careTasks) tasksByDay.get(dayKey(t.date))?.push(t);

  const vacationsByDay = new Map(days.map((d) => [dayKey(d), [] as typeof vacations]));
  for (const day of days) {
    for (const v of vacations) {
      if (isWithinInterval(day, { start: startOfDay(v.startDate), end: endOfDay(v.endDate) })) {
        vacationsByDay.get(dayKey(day))?.push(v);
      }
    }
  }

  const competitionsByDay = new Map(days.map((d) => [dayKey(d), [] as typeof competitions]));
  for (const day of days) {
    for (const c of competitions) {
      if (isWithinInterval(day, { start: startOfDay(c.startDate), end: endOfDay(c.endDate ?? c.startDate) })) {
        competitionsByDay.get(dayKey(day))?.push(c);
      }
    }
  }

  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const now = new Date();
  const nowTop = toGridPx(now.getHours() * 60 + now.getMinutes());
  const nowInRange = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/calendar?week=${prevWeek}`} variant="secondary">
              ← Prev
            </LinkButton>
            <LinkButton href="/calendar" variant="secondary">
              Today
            </LinkButton>
            <LinkButton href={`/calendar?week=${nextWeek}`} variant="secondary">
              Next →
            </LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
        <Legend color="var(--cal-shift)" label="Shift" />
        <Legend color="var(--cal-task)" label="Care task" />
        <Legend color="var(--cal-vacation)" label="Vacation" />
        <Legend color="var(--cal-competition)" label="Competition" />
        {isManager && (
          <div className="ml-auto flex flex-wrap gap-2">
            <LinkButton href="/staff" variant="secondary" className="px-2 py-1 text-xs">
              + Shift
            </LinkButton>
            <LinkButton href="/staff/vacations" variant="secondary" className="px-2 py-1 text-xs">
              + Vacation
            </LinkButton>
            <LinkButton href="/horses" variant="secondary" className="px-2 py-1 text-xs">
              + Care task
            </LinkButton>
            <LinkButton href="/competitions" variant="secondary" className="px-2 py-1 text-xs">
              + Competition
            </LinkButton>
          </div>
        )}
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            {/* Day headers */}
            <div />
            {days.map((day) => (
              <div
                key={`h-${dayKey(day)}`}
                className={`border-b border-stone-200 px-1 pb-2 text-center dark:border-neutral-800 ${
                  isToday(day) ? "text-emerald-700 dark:text-emerald-400" : "text-stone-700 dark:text-stone-200"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">{format(day, "EEE")}</p>
                <p className="text-lg font-semibold">{format(day, "d")}</p>
              </div>
            ))}

            {/* All-day / untimed events */}
            <div className="border-b border-stone-200 py-2 pr-2 text-right text-[11px] text-stone-400 dark:border-neutral-800">
              All day
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const dayVacations = vacationsByDay.get(key) ?? [];
              const dayCompetitions = competitionsByDay.get(key) ?? [];
              const dayTasks = tasksByDay.get(key) ?? [];
              return (
                <div
                  key={`allday-${key}`}
                  className="space-y-1 border-b border-l border-stone-100 p-1 dark:border-neutral-800/60"
                >
                  {dayVacations.map((v) => (
                    <div
                      key={v.id}
                      title={`${v.user.name} — vacation (${v.status.toLowerCase()})`}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white ${
                        v.status === "PENDING" ? "border border-dashed border-white/70 opacity-70" : ""
                      }`}
                      style={{ backgroundColor: "var(--cal-vacation)" }}
                    >
                      {v.user.name}
                    </div>
                  ))}
                  {dayCompetitions.map((c) => (
                    <Link
                      key={c.id}
                      href={`/competitions/${c.id}`}
                      title={c.name}
                      className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: "var(--cal-competition)" }}
                    >
                      {c.name}
                    </Link>
                  ))}
                  {dayTasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/horses/${t.horseId}`}
                      title={`${t.horse.name} — ${t.type}${t.assignedTo ? ` (${t.assignedTo.name})` : ""}`}
                      className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white ${
                        t.done ? "opacity-40 line-through" : ""
                      }`}
                      style={{ backgroundColor: "var(--cal-task)" }}
                    >
                      {t.horse.name} · {t.type.toLowerCase()}
                    </Link>
                  ))}
                </div>
              );
            })}

            {/* Time grid */}
            <div className="relative" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-stone-400"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const positioned = layoutShifts(shiftsByDay.get(key) ?? []);
              return (
                <div
                  key={`grid-${key}`}
                  className="relative border-l border-stone-100 dark:border-neutral-800/60"
                  style={{ height: GRID_HEIGHT }}
                >
                  {HOURS.slice(0, -1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-stone-100 dark:border-neutral-800/60"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {isToday(day) && nowInRange && (
                    <div className="absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: nowTop }}>
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {positioned.map((shift) => {
                    const widthPct = 100 / shift.colCount;
                    return (
                      <div
                        key={shift.id}
                        title={`${shift.user.name}: ${shift.startTime}–${shift.endTime}${shift.notes ? ` — ${shift.notes}` : ""}`}
                        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] text-white shadow-sm"
                        style={{
                          top: shift.top,
                          height: shift.height,
                          left: `${shift.col * widthPct}%`,
                          width: `calc(${widthPct}% - 2px)`,
                          backgroundColor: "var(--cal-shift)",
                        }}
                      >
                        <p className="truncate font-medium">{shift.user.name}</p>
                        <p className="truncate opacity-90">
                          {shift.startTime}–{shift.endTime}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {!days.some((d) => isSameDay(d, now)) && (
        <p className="mt-3 text-xs text-stone-400">
          Viewing a different week than today — the time-of-day indicator only shows on the current week.
        </p>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
