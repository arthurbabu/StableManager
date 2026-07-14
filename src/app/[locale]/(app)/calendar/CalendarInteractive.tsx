"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { Button, Card, LinkButton } from "@/components/ui";
import { SlideOver } from "@/components/SlideOver";
import { AddShiftForm } from "./forms/AddShiftForm";
import { AddTaskForm } from "./forms/AddTaskForm";
import { AddCompetitionForm } from "./forms/AddCompetitionForm";
import { VacationReviewPanel } from "./forms/VacationReviewPanel";

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

function toGridPx(minutesSinceMidnight: number) {
  const relative = minutesSinceMidnight - START_HOUR * 60;
  const clamped = Math.min(Math.max(relative, 0), TOTAL_MINUTES);
  return (clamped / 60) * HOUR_HEIGHT;
}

/** Rounds pixel offset within the grid to the nearest 30-minute "HH:mm". */
function pxToTime(offsetY: number) {
  const rawMinutes = START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
  const rounded = Math.round(rawMinutes / 30) * 30;
  const clamped = Math.min(Math.max(rounded, START_HOUR * 60), END_HOUR * 60 - 30);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

type ShiftEntry = {
  id: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  user: { name: string };
};

type TaskEntry = {
  id: string;
  type: "FEEDING" | "GROOMING" | "TRAINING" | "FARRIER" | "VET" | "TURNOUT" | "OTHER";
  date: Date;
  done: boolean;
  horseId: string;
  horse: { name: string };
  assignedTo: { name: string } | null;
};

type VacationEntry = {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: { name: string };
};

type CompetitionEntry = {
  id: string;
  name: string;
};

type Person = { id: string; name: string };

type PositionedShift = ShiftEntry & { top: number; height: number; col: number; colCount: number };

function layoutShifts(shifts: ShiftEntry[]): PositionedShift[] {
  const sorted = [...shifts].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime),
  );

  const result: PositionedShift[] = [];
  let cluster: { shift: ShiftEntry; start: number; end: number }[] = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const placed: { shift: ShiftEntry; start: number; end: number; col: number }[] = [];
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

type PanelState =
  | { type: "shift"; date: string; startTime?: string }
  | { type: "task"; date: string }
  | { type: "competition"; date: string }
  | { type: "vacation"; vacation: VacationEntry };

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function CalendarInteractive({
  days,
  shiftsByDay,
  tasksByDay,
  vacationsByDay,
  competitionsByDay,
  staff,
  horses,
  isManager,
  todayKey,
  defaultDateKey,
}: {
  days: Date[];
  shiftsByDay: Record<string, ShiftEntry[]>;
  tasksByDay: Record<string, TaskEntry[]>;
  vacationsByDay: Record<string, VacationEntry[]>;
  competitionsByDay: Record<string, CompetitionEntry[]>;
  staff: Person[];
  horses: Person[];
  isManager: boolean;
  todayKey: string;
  defaultDateKey: string;
}) {
  const t = useTranslations("Calendar");
  const tTaskTypes = useTranslations("TaskTypes");
  const tStatus = useTranslations("VacationStatus");
  const tVacations = useTranslations("Vacations");
  const tStaff = useTranslations("Staff");
  const tHorseDetail = useTranslations("HorseDetail");
  const tCompetitions = useTranslations("Competitions");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);

  const [panel, setPanel] = useState<PanelState | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Deliberately set only post-mount (state starts null) so the current-time
  // indicator's position is never part of the server-rendered HTML — it would
  // otherwise drift from the client's clock and cause a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only clock read, see comment above
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowTop = now ? toGridPx(now.getHours() * 60 + now.getMinutes()) : 0;
  const nowInRange = now ? now.getHours() >= START_HOUR && now.getHours() < END_HOUR : false;
  const showOtherWeekNotice = !days.some((d) => dayKey(d) === todayKey);

  const close = () => setPanel(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
        <Legend color="var(--cal-shift)" label={t("legendShift")} />
        <Legend color="var(--cal-task)" label={t("legendTask")} />
        <Legend color="var(--cal-vacation)" label={t("legendVacation")} />
        <Legend color="var(--cal-competition)" label={t("legendCompetition")} />
        {isManager && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPanel({ type: "shift", date: defaultDateKey })}
              className="px-2 py-1 text-xs"
            >
              {t("addShift")}
            </Button>
            <LinkButton href="/staff/vacations" variant="secondary" className="px-2 py-1 text-xs">
              {t("addVacation")}
            </LinkButton>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPanel({ type: "task", date: defaultDateKey })}
              className="px-2 py-1 text-xs"
            >
              {t("addTask")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPanel({ type: "competition", date: defaultDateKey })}
              className="px-2 py-1 text-xs"
            >
              {t("addCompetition")}
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            {/* Day headers */}
            <div />
            {days.map((day) => {
              const isToday = dayKey(day) === todayKey;
              return (
                <div
                  key={`h-${dayKey(day)}`}
                  className={`border-b border-stone-200 px-1 pb-2 text-center dark:border-neutral-800 ${
                    isToday ? "text-emerald-700 dark:text-emerald-400" : "text-stone-700 dark:text-stone-200"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {format(day, "EEE", { locale: dateLocale })}
                  </p>
                  <p className="text-lg font-semibold">{format(day, "d")}</p>
                </div>
              );
            })}

            {/* All-day / untimed events */}
            <div className="border-b border-stone-200 py-2 pr-2 text-right text-[11px] text-stone-400 dark:border-neutral-800">
              {t("allDay")}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const dayVacations = vacationsByDay[key] ?? [];
              const dayCompetitions = competitionsByDay[key] ?? [];
              const dayTasks = tasksByDay[key] ?? [];
              return (
                <div
                  key={`allday-${key}`}
                  className="space-y-1 border-b border-l border-stone-100 p-1 dark:border-neutral-800/60"
                >
                  {dayVacations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPanel({ type: "vacation", vacation: v })}
                      title={`${v.user.name} — ${t("legendVacation")} (${tStatus(v.status)})`}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white ${
                        v.status === "PENDING" ? "border border-dashed border-white/70 opacity-70" : ""
                      }`}
                      style={{ backgroundColor: "var(--cal-vacation)" }}
                    >
                      {v.user.name}
                    </button>
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
                  {dayTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/horses/${task.horseId}`}
                      title={`${task.horse.name} — ${tTaskTypes(task.type)}${task.assignedTo ? ` (${task.assignedTo.name})` : ""}`}
                      className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white ${
                        task.done ? "opacity-40 line-through" : ""
                      }`}
                      style={{ backgroundColor: "var(--cal-task)" }}
                    >
                      {task.horse.name} · {tTaskTypes(task.type)}
                    </Link>
                  ))}
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setPanel({ type: "task", date: key })}
                      aria-label={tHorseDetail("addCareTask")}
                      className="block w-full rounded border border-dashed border-stone-300 py-0.5 text-center text-[11px] text-stone-400 hover:border-stone-400 hover:text-stone-600 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-stone-300"
                    >
                      +
                    </button>
                  )}
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
              const positioned = layoutShifts(shiftsByDay[key] ?? []);
              const isToday = key === todayKey;
              return (
                <div
                  key={`grid-${key}`}
                  onClick={
                    isManager
                      ? (e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetY = e.clientY - rect.top;
                          setPanel({ type: "shift", date: key, startTime: pxToTime(offsetY) });
                        }
                      : undefined
                  }
                  className={`relative border-l border-stone-100 dark:border-neutral-800/60 ${
                    isManager ? "cursor-pointer" : ""
                  }`}
                  style={{ height: GRID_HEIGHT }}
                >
                  {HOURS.slice(0, -1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-stone-100 dark:border-neutral-800/60"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {isToday && nowInRange && (
                    <div className="absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: nowTop }}>
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {positioned.map((shift) => {
                    const widthPct = 100 / shift.colCount;
                    return (
                      <div
                        key={shift.id}
                        onClick={(e) => e.stopPropagation()}
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

      {showOtherWeekNotice && <p className="mt-3 text-xs text-stone-400">{t("otherWeekNotice")}</p>}

      <SlideOver
        open={panel !== null}
        onClose={close}
        title={
          panel?.type === "shift"
            ? tStaff("addShift")
            : panel?.type === "task"
              ? tHorseDetail("addCareTask")
              : panel?.type === "competition"
                ? tCompetitions("addCompetition")
                : panel?.type === "vacation"
                  ? tVacations("details")
                  : ""
        }
      >
        {panel?.type === "shift" && (
          <AddShiftForm date={panel.date} startTime={panel.startTime} staff={staff} onDone={close} />
        )}
        {panel?.type === "task" && (
          <AddTaskForm date={panel.date} horses={horses} staff={staff} onDone={close} />
        )}
        {panel?.type === "competition" && <AddCompetitionForm date={panel.date} onDone={close} />}
        {panel?.type === "vacation" && (
          <VacationReviewPanel vacation={panel.vacation} isManager={isManager} onDone={close} />
        )}
      </SlideOver>
    </div>
  );
}
