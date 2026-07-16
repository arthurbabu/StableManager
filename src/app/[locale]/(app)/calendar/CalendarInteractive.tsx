"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { TASK_TYPES } from "@/lib/constants";
import { Button, Card, LinkButton, Select } from "@/components/ui";
import { SlideOver } from "@/components/SlideOver";
import { ShiftForm } from "./forms/ShiftForm";
import { TaskForm } from "./forms/TaskForm";
import { AddCompetitionForm } from "./forms/AddCompetitionForm";
import { VacationReviewPanel } from "./forms/VacationReviewPanel";

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_HEIGHT = 48; // px
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const DRAG_CLICK_THRESHOLD_PX = 8;

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function minutesToTimeStr(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
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
  const clamped = Math.min(Math.max(rounded, START_HOUR * 60), END_HOUR * 60);
  return minutesToTimeStr(clamped);
}

function addMinutes(time: string, mins: number) {
  const total = (toMinutes(time) + mins) % (24 * 60);
  return minutesToTimeStr(total);
}

function resolveDragRange(startY: number, currentY: number) {
  const lo = Math.min(startY, currentY);
  const hi = Math.max(startY, currentY);
  const startTime = pxToTime(lo);
  let endTime = pxToTime(hi);
  if (endTime <= startTime) endTime = addMinutes(startTime, 30);
  return { startTime, endTime };
}

type TaskType = (typeof TASK_TYPES)[number];

type ShiftEntry = {
  id: string;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes: string | null;
  user: { name: string };
};

type TaskEntry = {
  id: string;
  horseId: string;
  type: TaskType;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  assignedToId: string | null;
  notes: string | null;
  done: boolean;
  horse: { name: string };
  assignedTo: { name: string } | null;
};

type VacationEntry = {
  id: string;
  userId: string;
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

type PositionedTask = TaskEntry & { startTime: string; endTime: string; top: number; height: number; col: number; colCount: number };

function layoutTimedTasks(tasks: (TaskEntry & { startTime: string; endTime: string })[]): PositionedTask[] {
  const sorted = [...tasks].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime),
  );

  const result: PositionedTask[] = [];
  let cluster: { task: TaskEntry & { startTime: string; endTime: string }; start: number; end: number }[] = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const placed: { task: TaskEntry & { startTime: string; endTime: string }; start: number; end: number; col: number }[] = [];
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
      result.push({ ...p.task, top, height, col: p.col, colCount });
    }
    cluster = [];
    clusterMaxEnd = -Infinity;
  };

  for (const t of sorted) {
    const start = toMinutes(t.startTime);
    const end = Math.max(toMinutes(t.endTime), start + 15);
    if (cluster.length > 0 && start >= clusterMaxEnd) flush();
    cluster.push({ task: t, start, end });
    clusterMaxEnd = Math.max(clusterMaxEnd, end);
  }
  flush();

  return result;
}

type PanelState =
  | { kind: "shift"; date: string; startTime?: string; existing?: { id: string; userId: string; date: string; startTime: string; endTime: string; notes: string | null } }
  | {
      kind: "task";
      date: string;
      startTime?: string;
      endTime?: string;
      existing?: {
        id: string;
        horseId: string;
        type: TaskType;
        date: string;
        startTime: string | null;
        endTime: string | null;
        assignedToId: string | null;
        notes: string | null;
      };
    }
  | { kind: "competition"; date: string }
  | { kind: "vacation"; vacation: VacationEntry };

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
  const [staffFilter, setStaffFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [drag, setDrag] = useState<{ dayKey: string; startY: number; currentY: number } | null>(null);

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
  const matchesStaff = (personId: string | null | undefined) => !staffFilter || personId === staffFilter;
  const matchesCategory = (type: string) => !categoryFilter || type === categoryFilter;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="w-auto py-1 text-xs"
        >
          <option value="">{t("allStaff")}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-auto py-1 text-xs"
        >
          <option value="">{t("allCategories")}</option>
          {TASK_TYPES.map((type) => (
            <option key={type} value={type}>
              {tTaskTypes(type)}
            </option>
          ))}
        </Select>
      </div>

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
              onClick={() => setPanel({ kind: "shift", date: defaultDateKey })}
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
              onClick={() => setPanel({ kind: "task", date: defaultDateKey })}
              className="px-2 py-1 text-xs"
            >
              {t("addTask")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPanel({ kind: "competition", date: defaultDateKey })}
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

            {/* Shift marks — compact, not time-positioned */}
            <div className="border-b border-stone-200 py-2 pr-2 text-right text-[11px] text-stone-400 dark:border-neutral-800">
              {t("legendShift")}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const dayShifts = (shiftsByDay[key] ?? []).filter((s) => matchesStaff(s.userId));
              return (
                <div
                  key={`shifts-${key}`}
                  className="space-y-1 border-b border-l border-stone-100 p-1 dark:border-neutral-800/60"
                >
                  {dayShifts.map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() =>
                        isManager &&
                        setPanel({
                          kind: "shift",
                          date: key,
                          existing: {
                            id: shift.id,
                            userId: shift.userId,
                            date: dayKey(shift.date),
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            notes: shift.notes,
                          },
                        })
                      }
                      title={`${shift.user.name}: ${shift.startTime}–${shift.endTime}${shift.notes ? ` — ${shift.notes}` : ""}`}
                      className={`flex w-full items-center justify-between gap-1 truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] text-stone-700 dark:text-stone-100 ${
                        isManager ? "cursor-pointer hover:brightness-95" : ""
                      }`}
                      style={{ borderLeftColor: "var(--cal-shift)", backgroundColor: "var(--cal-shift-bg)" }}
                    >
                      <span className="truncate font-medium">{shift.user.name}</span>
                      <span className="shrink-0 text-stone-500 dark:text-stone-400">
                        {shift.startTime}–{shift.endTime}
                      </span>
                    </button>
                  ))}
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setPanel({ kind: "shift", date: key })}
                      aria-label={tStaff("addShift")}
                      className="block w-full rounded border border-dashed border-stone-300 py-0.5 text-center text-[11px] text-stone-400 hover:border-stone-400 hover:text-stone-600 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-stone-300"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}

            {/* All-day / untimed events */}
            <div className="border-b border-stone-200 py-2 pr-2 text-right text-[11px] text-stone-400 dark:border-neutral-800">
              {t("allDay")}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const dayVacations = (vacationsByDay[key] ?? []).filter((v) => matchesStaff(v.userId));
              const dayCompetitions = competitionsByDay[key] ?? [];
              const dayUntimedTasks = (tasksByDay[key] ?? []).filter(
                (task) => !task.startTime && matchesStaff(task.assignedToId) && matchesCategory(task.type),
              );
              return (
                <div
                  key={`allday-${key}`}
                  className="space-y-1 border-b border-l border-stone-100 p-1 dark:border-neutral-800/60"
                >
                  {dayVacations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPanel({ kind: "vacation", vacation: v })}
                      title={`${v.user.name} — ${t("legendVacation")} (${tStatus(v.status)})`}
                      className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium text-stone-700 dark:text-stone-100 ${
                        v.status === "PENDING" ? "border-dashed opacity-80" : ""
                      }`}
                      style={{ borderLeftColor: "var(--cal-vacation)", backgroundColor: "var(--cal-vacation-bg)" }}
                    >
                      {v.user.name}
                    </button>
                  ))}
                  {dayCompetitions.map((c) => (
                    <Link
                      key={c.id}
                      href={`/competitions/${c.id}`}
                      title={c.name}
                      className="block truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] font-medium text-stone-700 dark:text-stone-100"
                      style={{ borderLeftColor: "var(--cal-competition)", backgroundColor: "var(--cal-competition-bg)" }}
                    >
                      {c.name}
                    </Link>
                  ))}
                  {dayUntimedTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() =>
                        isManager &&
                        setPanel({
                          kind: "task",
                          date: key,
                          existing: {
                            id: task.id,
                            horseId: task.horseId,
                            type: task.type,
                            date: dayKey(task.date),
                            startTime: task.startTime,
                            endTime: task.endTime,
                            assignedToId: task.assignedToId,
                            notes: task.notes,
                          },
                        })
                      }
                      title={`${task.horse.name} — ${tTaskTypes(task.type)}${task.assignedTo ? ` (${task.assignedTo.name})` : ""}`}
                      className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium text-stone-700 dark:text-stone-100 ${
                        task.done ? "opacity-50 line-through" : ""
                      } ${isManager ? "cursor-pointer" : ""}`}
                      style={{ borderLeftColor: "var(--cal-task)", backgroundColor: "var(--cal-task-bg)" }}
                    >
                      {task.horse.name} · {tTaskTypes(task.type)}
                    </button>
                  ))}
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setPanel({ kind: "task", date: key })}
                      aria-label={tHorseDetail("addCareTask")}
                      className="block w-full rounded border border-dashed border-stone-300 py-0.5 text-center text-[11px] text-stone-400 hover:border-stone-400 hover:text-stone-600 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-stone-300"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}

            {/* Time grid — timed tasks live here; drag to create, click to edit */}
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
              const timedTasks = (tasksByDay[key] ?? []).filter(
                (task): task is TaskEntry & { startTime: string; endTime: string } =>
                  !!task.startTime && !!task.endTime && matchesStaff(task.assignedToId) && matchesCategory(task.type),
              );
              const positioned = layoutTimedTasks(timedTasks);
              const isToday = key === todayKey;
              const isDraggingHere = drag && drag.dayKey === key;

              return (
                <div
                  key={`grid-${key}`}
                  onPointerDown={
                    isManager
                      ? (e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetY = Math.min(Math.max(e.clientY - rect.top, 0), GRID_HEIGHT);
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDrag({ dayKey: key, startY: offsetY, currentY: offsetY });
                        }
                      : undefined
                  }
                  onPointerMove={
                    isManager
                      ? (e) => {
                          if (!drag || drag.dayKey !== key) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetY = Math.min(Math.max(e.clientY - rect.top, 0), GRID_HEIGHT);
                          setDrag((prev) => (prev ? { ...prev, currentY: offsetY } : prev));
                        }
                      : undefined
                  }
                  onPointerUp={
                    isManager
                      ? () => {
                          if (!drag || drag.dayKey !== key) return;
                          const isClick = Math.abs(drag.currentY - drag.startY) < DRAG_CLICK_THRESHOLD_PX;
                          const range = isClick
                            ? { startTime: pxToTime(drag.startY), endTime: addMinutes(pxToTime(drag.startY), 60) }
                            : resolveDragRange(drag.startY, drag.currentY);
                          setDrag(null);
                          setPanel({ kind: "task", date: key, startTime: range.startTime, endTime: range.endTime });
                        }
                      : undefined
                  }
                  className={`relative border-l border-stone-100 dark:border-neutral-800/60 ${
                    isManager ? "cursor-crosshair" : ""
                  }`}
                  style={{ height: GRID_HEIGHT, touchAction: isManager ? "none" : undefined }}
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

                  {isDraggingHere && (
                    <div
                      className="absolute inset-x-0.5 z-20 rounded-md border-2 border-dashed"
                      style={{
                        top: Math.min(drag.startY, drag.currentY),
                        height: Math.max(Math.abs(drag.currentY - drag.startY), 4),
                        backgroundColor: "var(--cal-task-bg)",
                        borderColor: "var(--cal-task)",
                      }}
                    />
                  )}

                  {positioned.map((task) => {
                    const widthPct = 100 / task.colCount;
                    return (
                      <div
                        key={task.id}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          isManager &&
                          setPanel({
                            kind: "task",
                            date: key,
                            existing: {
                              id: task.id,
                              horseId: task.horseId,
                              type: task.type,
                              date: dayKey(task.date),
                              startTime: task.startTime,
                              endTime: task.endTime,
                              assignedToId: task.assignedToId,
                              notes: task.notes,
                            },
                          })
                        }
                        title={`${task.horse.name}: ${task.startTime}–${task.endTime} — ${tTaskTypes(task.type)}${task.assignedTo ? ` (${task.assignedTo.name})` : ""}`}
                        className={`absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] text-stone-700 shadow-sm dark:text-stone-100 ${
                          task.done ? "opacity-50 line-through" : ""
                        } ${isManager ? "cursor-pointer" : ""}`}
                        style={{
                          top: task.top,
                          height: task.height,
                          left: `${task.col * widthPct}%`,
                          width: `calc(${widthPct}% - 2px)`,
                          borderLeftColor: "var(--cal-task)",
                          backgroundColor: "var(--cal-task-bg)",
                        }}
                      >
                        <p className="truncate font-medium">{task.horse.name}</p>
                        <p className="truncate opacity-80">
                          {tTaskTypes(task.type)} · {task.startTime}–{task.endTime}
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
          panel?.kind === "shift"
            ? panel.existing
              ? t("editShift")
              : tStaff("addShift")
            : panel?.kind === "task"
              ? panel.existing
                ? t("editTask")
                : tHorseDetail("addCareTask")
              : panel?.kind === "competition"
                ? tCompetitions("addCompetition")
                : panel?.kind === "vacation"
                  ? tVacations("details")
                  : ""
        }
      >
        {panel?.kind === "shift" && (
          <ShiftForm date={panel.date} startTime={panel.startTime} shift={panel.existing} staff={staff} onDone={close} />
        )}
        {panel?.kind === "task" && (
          <TaskForm
            date={panel.date}
            startTime={panel.startTime}
            endTime={panel.endTime}
            task={panel.existing}
            horses={horses}
            staff={staff}
            onDone={close}
          />
        )}
        {panel?.kind === "competition" && <AddCompetitionForm date={panel.date} onDone={close} />}
        {panel?.kind === "vacation" && (
          <VacationReviewPanel vacation={panel.vacation} isManager={isManager} onDone={close} />
        )}
      </SlideOver>
    </div>
  );
}
