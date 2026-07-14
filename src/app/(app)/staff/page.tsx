import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Button, LinkButton, Input, Select } from "@/components/ui";
import { createShift, deleteShift } from "./actions";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const isManager = canManage(user.role);

  const anchor = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [shifts, staff] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: { user: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const shiftsByDay = new Map<string, typeof shifts>();
  for (const day of days) shiftsByDay.set(format(day, "yyyy-MM-dd"), []);
  for (const shift of shifts) {
    const key = format(shift.date, "yyyy-MM-dd");
    shiftsByDay.get(key)?.push(shift);
  }

  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        title="Staff schedule"
        subtitle={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/staff?week=${prevWeek}`} variant="secondary">
              ← Prev
            </LinkButton>
            <LinkButton href={`/staff?week=${nextWeek}`} variant="secondary">
              Next →
            </LinkButton>
            <LinkButton href="/staff/vacations" variant="secondary">
              Vacations
            </LinkButton>
          </div>
        }
      />

      {isManager && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Add a shift
          </h2>
          <form action={createShift} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Select name="userId" required defaultValue="" className="col-span-2 md:col-span-1">
              <option value="" disabled>
                Staff member
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input type="date" name="date" required defaultValue={format(anchor, "yyyy-MM-dd")} />
            <Input type="time" name="startTime" required defaultValue="08:00" />
            <Input type="time" name="endTime" required defaultValue="16:00" />
            <Input type="text" name="notes" placeholder="Notes (optional)" />
            <Button type="submit" className="col-span-2 md:col-span-5">
              Add shift
            </Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayShifts = shiftsByDay.get(key) ?? [];
          return (
            <Card key={key} className={isToday(day) ? "ring-2 ring-emerald-600" : ""}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {format(day, "EEE d")}
              </p>
              {dayShifts.length === 0 ? (
                <p className="text-xs text-stone-400">—</p>
              ) : (
                <ul className="space-y-2">
                  {dayShifts.map((shift) => (
                    <li key={shift.id} className="rounded-lg bg-stone-50 p-2 text-xs dark:bg-neutral-800">
                      <p className="font-medium text-stone-700 dark:text-stone-200">
                        {shift.user.name}
                      </p>
                      <p className="text-stone-500 dark:text-stone-400">
                        {shift.startTime}–{shift.endTime}
                      </p>
                      {shift.notes && (
                        <p className="mt-1 text-stone-400">{shift.notes}</p>
                      )}
                      {isManager && (
                        <form action={deleteShift} className="mt-1">
                          <input type="hidden" name="id" value={shift.id} />
                          <button className="text-red-500 hover:underline" type="submit">
                            Remove
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {shifts.length === 0 && (
        <div className="mt-4">
          <EmptyState message="No shifts scheduled this week." />
        </div>
      )}
    </div>
  );
}
