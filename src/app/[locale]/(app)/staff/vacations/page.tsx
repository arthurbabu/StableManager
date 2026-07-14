import { format } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Textarea } from "@/components/ui";
import { requestVacation, reviewVacation, cancelVacation } from "./actions";

const statusColor = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
} as const;

export default async function VacationsPage() {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const t = await getTranslations("Vacations");
  const tCommon = await getTranslations("Common");
  const tStatus = await getTranslations("VacationStatus");
  const locale = await getLocale();
  const dateLocale = getDateFnsLocale(locale);

  const requests = await prisma.vacationRequest.findMany({
    where: isManager ? {} : { userId: user.id },
    include: { user: true, reviewedBy: true },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={isManager ? t("subtitleManager") : t("subtitleStaff")}
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
          {t("requestTimeOff")}
        </h2>
        <form action={requestVacation} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input type="date" name="startDate" required />
          <Input type="date" name="endDate" required />
          <Textarea
            name="reason"
            placeholder={t("reasonOptional")}
            className="md:col-span-2"
            rows={1}
          />
          <Button type="submit" className="md:col-span-4">
            {t("submitRequest")}
          </Button>
        </form>
      </Card>

      {requests.length === 0 ? (
        <EmptyState message={t("noRequests")} />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {isManager && (
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {r.user.name}
                  </p>
                )}
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  {format(r.startDate, "d MMM yyyy", { locale: dateLocale })} –{" "}
                  {format(r.endDate, "d MMM yyyy", { locale: dateLocale })}
                </p>
                {r.reason && (
                  <p className="mt-1 text-sm text-stone-400">{r.reason}</p>
                )}
                {r.reviewedBy && (
                  <p className="mt-1 text-xs text-stone-400">
                    {t("reviewedBy", { name: r.reviewedBy.name })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge color={statusColor[r.status]}>{tStatus(r.status)}</Badge>

                {isManager && r.status === "PENDING" && (
                  <>
                    <form action={reviewVacation}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <Button type="submit" variant="primary" className="px-2 py-1 text-xs">
                        {t("approve")}
                      </Button>
                    </form>
                    <form action={reviewVacation}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                        {t("reject")}
                      </Button>
                    </form>
                  </>
                )}

                {(r.userId === user.id || user.role === "ADMIN") && r.status === "PENDING" && (
                  <form action={cancelVacation}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                      {tCommon("cancel")}
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
