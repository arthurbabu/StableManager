import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
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

  const requests = await prisma.vacationRequest.findMany({
    where: isManager ? {} : { userId: user.id },
    include: { user: true, reviewedBy: true },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Vacation requests"
        subtitle={isManager ? "Review and manage time-off for the whole team" : "Request and track your time off"}
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
          Request time off
        </h2>
        <form action={requestVacation} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input type="date" name="startDate" required />
          <Input type="date" name="endDate" required />
          <Textarea
            name="reason"
            placeholder="Reason (optional)"
            className="md:col-span-2"
            rows={1}
          />
          <Button type="submit" className="md:col-span-4">
            Submit request
          </Button>
        </form>
      </Card>

      {requests.length === 0 ? (
        <EmptyState message="No vacation requests yet." />
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
                  {format(r.startDate, "MMM d, yyyy")} – {format(r.endDate, "MMM d, yyyy")}
                </p>
                {r.reason && (
                  <p className="mt-1 text-sm text-stone-400">{r.reason}</p>
                )}
                {r.reviewedBy && (
                  <p className="mt-1 text-xs text-stone-400">
                    Reviewed by {r.reviewedBy.name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge color={statusColor[r.status]}>{r.status}</Badge>

                {isManager && r.status === "PENDING" && (
                  <>
                    <form action={reviewVacation}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <Button type="submit" variant="primary" className="px-2 py-1 text-xs">
                        Approve
                      </Button>
                    </form>
                    <form action={reviewVacation}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                        Reject
                      </Button>
                    </form>
                  </>
                )}

                {(r.userId === user.id || user.role === "ADMIN") && r.status === "PENDING" && (
                  <form action={cancelVacation}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                      Cancel
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
