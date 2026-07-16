import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { Card, Badge, EmptyState, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("Dashboard");
  const tTaskTypes = await getTranslations("TaskTypes");
  const locale = await getLocale();
  const dateLocale = getDateFnsLocale(locale);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [todaysShifts, myTasksToday, upcomingVacations, pendingVacations, upcomingCompetitions, vetReminderCandidates] =
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
      prisma.careTask.findMany({
        where: { type: "VET", reminderDelayDays: { not: null } },
        include: { horse: true },
      }),
    ]);

  // reminderDelayDays is an offset from `date`, not a stored absolute date
  // (see CareTask.reminderDelayDays), so the due date has to be computed
  // here rather than filtered/sorted in the query itself.
  const vetReminders = vetReminderCandidates
    .map((task) => ({ task, dueDate: addDays(task.date, task.reminderDelayDays!) }))
    .filter(({ dueDate }) => dueDate <= addDays(todayStart, 30))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title={t("welcome", { name: user.name?.split(" ")[0] ?? "" })}
        subtitle={format(new Date(), "EEEE d MMMM yyyy", { locale: dateLocale })}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("todaysShifts")}
          </h2>
          {todaysShifts.length === 0 ? (
            <EmptyState message={t("noShiftsToday")} />
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
            {t("viewFullSchedule")}
          </Link>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("yourTasksToday")}
          </h2>
          {myTasksToday.length === 0 ? (
            <EmptyState message={t("noTasksToday")} />
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
                  <Badge>{tTaskTypes(task.type)}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/horses"
            className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            {t("viewHorses")}
          </Link>
        </Card>

        {canManage(user.role) && (
          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
              {t("vacationsAwaitingReview")}
            </h2>
            {pendingVacations.length === 0 ? (
              <EmptyState message={t("noPendingRequests")} />
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
                      {format(v.startDate, "d MMM", { locale: dateLocale })}–
                      {format(v.endDate, "d MMM", { locale: dateLocale })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/staff/vacations"
              className="mt-3 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400"
            >
              {t("reviewRequests")}
            </Link>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("whosOffSoon")}
          </h2>
          {upcomingVacations.length === 0 ? (
            <EmptyState message={t("noUpcomingVacations")} />
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
                    {format(v.startDate, "d MMM", { locale: dateLocale })}–
                    {format(v.endDate, "d MMM", { locale: dateLocale })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("vetReminders")}
          </h2>
          {vetReminders.length === 0 ? (
            <EmptyState message={t("noVetReminders")} />
          ) : (
            <ul className="space-y-2">
              {vetReminders.map(({ task, dueDate }) => {
                const overdue = dueDate < todayStart;
                return (
                  <li key={task.id}>
                    <Link
                      href={`/horses/${task.horseId}`}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm hover:bg-stone-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                      <span className="font-medium text-stone-700 dark:text-stone-200">
                        {task.horse.name}
                      </span>
                      <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : "text-stone-500 dark:text-stone-400"}>
                        {format(dueDate, "d MMM yyyy", { locale: dateLocale })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("upcomingCompetitions")}
          </h2>
          {upcomingCompetitions.length === 0 ? (
            <EmptyState message={t("noCompetitions")} />
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
                      {format(c.startDate, "d MMM", { locale: dateLocale })} ·{" "}
                      {t("entries", { count: c.entries.length })}
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
            {t("viewAllCompetitions")}
          </Link>
        </Card>
      </div>
    </div>
  );
}
