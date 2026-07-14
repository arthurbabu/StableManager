import Link from "next/link";
import { endOfDay, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [todaysShifts, myTasksToday, upcomingVacations, pendingVacations, upcomingCompetitions] =
    await Promise.all([
      prisma.shift.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        include: { user: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.careTask.findMany({
        where: {
          assignedToId: user.id,
          date: { gte: todayStart, lte: todayEnd },
          done: false,
        },
        include: { horse: true },
        orderBy: { type: "asc" },
      }),
      prisma.vacationRequest.findMany({
        where: {
          status: "APPROVED",
          endDate: { gte: todayStart },
        },
        include: { user: true },
        orderBy: { startDate: "asc" },
        take: 5,
      }),
      canManage(user.role)
        ? prisma.vacationRequest.findMany({
            where: { status: "PENDING" },
            include: { user: true },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      prisma.competition.findMany({
        where: { startDate: { gte: todayStart } },
        orderBy: { startDate: "asc" },
        take: 3,
        include: { entries: true },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name?.split(" ")[0]}`}
        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Today&apos;s shifts
          </h2>
          {todaysShifts.length === 0 ? (
            <EmptyState message="No shifts scheduled for today." />
          ) : (
            <ul className="space-y-2">
              {todaysShifts.map((shift) => (
                <li
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-neutral-800"
                >
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {shift.user.name}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    {shift.startTime}–{shift.endTime}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/staff"
            className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            View full schedule →
          </Link>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Your tasks today
          </h2>
          {myTasksToday.length === 0 ? (
            <EmptyState message="Nothing assigned to you today." />
          ) : (
            <ul className="space-y-2">
              {myTasksToday.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-neutral-800"
                >
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {task.horse.name}
                  </span>
                  <Badge>{task.type}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/horses"
            className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            View horses →
          </Link>
        </Card>

        {canManage(user.role) && (
          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
              Vacation requests awaiting review
            </h2>
            {pendingVacations.length === 0 ? (
              <EmptyState message="No pending requests." />
            ) : (
              <ul className="space-y-2">
                {pendingVacations.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-neutral-800"
                  >
                    <span className="font-medium text-stone-700 dark:text-stone-200">
                      {v.user.name}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">
                      {format(v.startDate, "MMM d")}–{format(v.endDate, "MMM d")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/staff/vacations"
              className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
            >
              Review requests →
            </Link>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Who&apos;s off soon
          </h2>
          {upcomingVacations.length === 0 ? (
            <EmptyState message="No upcoming approved vacations." />
          ) : (
            <ul className="space-y-2">
              {upcomingVacations.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-neutral-800"
                >
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {v.user.name}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    {format(v.startDate, "MMM d")}–{format(v.endDate, "MMM d")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Upcoming competitions
          </h2>
          {upcomingCompetitions.length === 0 ? (
            <EmptyState message="No competitions scheduled." />
          ) : (
            <ul className="space-y-2">
              {upcomingCompetitions.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/competitions/${c.id}`}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm hover:bg-stone-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    <span>
                      <span className="font-medium text-stone-700 dark:text-stone-200">
                        {c.name}
                      </span>
                      {c.location && (
                        <span className="text-stone-400"> · {c.location}</span>
                      )}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">
                      {format(c.startDate, "MMM d")} · {c.entries.length} entries
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/competitions"
            className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            View all competitions →
          </Link>
        </Card>
      </div>
    </div>
  );
}
