import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Textarea } from "@/components/ui";
import { createCompetition } from "./actions";

export default async function CompetitionsPage() {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const now = new Date();

  const competitions = await prisma.competition.findMany({
    orderBy: { startDate: "asc" },
    include: { entries: true },
  });

  const upcoming = competitions.filter((c) => c.startDate >= now);
  const past = competitions.filter((c) => c.startDate < now);

  return (
    <div>
      <PageHeader title="Competitions" subtitle={`${upcoming.length} upcoming`} />

      {isManager && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Add a competition
          </h2>
          <form action={createCompetition} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Input type="text" name="name" placeholder="Name" required className="col-span-2" />
            <Input type="text" name="location" placeholder="Location" />
            <Input type="date" name="startDate" required />
            <Input type="date" name="endDate" placeholder="End date (optional)" />
            <Textarea name="notes" placeholder="Notes" className="col-span-2 md:col-span-3" rows={1} />
            <Button type="submit" className="col-span-2 md:col-span-4">
              Add competition
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming competitions." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Past
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CompetitionCard({
  competition,
}: {
  competition: { id: string; name: string; location: string | null; startDate: Date; entries: unknown[] };
}) {
  return (
    <Link href={`/competitions/${competition.id}`}>
      <Card className="h-full transition hover:border-emerald-600">
        <p className="font-medium text-stone-900 dark:text-stone-50">{competition.name}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {format(competition.startDate, "MMM d, yyyy")}
          {competition.location && ` · ${competition.location}`}
        </p>
        <div className="mt-3">
          <Badge>{competition.entries.length} entries</Badge>
        </div>
      </Card>
    </Link>
  );
}
