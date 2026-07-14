import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Button, Input, Select } from "@/components/ui";
import { addEntry, updateEntryResult, removeEntry, deleteCompetition } from "../actions";

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const { id } = await params;

  const [competition, horses, riders] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      include: {
        entries: {
          include: { horse: true, rider: true },
        },
      },
    }),
    prisma.horse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!competition) notFound();

  return (
    <div>
      <PageHeader
        title={competition.name}
        subtitle={[
          format(competition.startDate, "MMM d, yyyy"),
          competition.endDate ? `– ${format(competition.endDate, "MMM d, yyyy")}` : null,
          competition.location,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          isManager && (
            <form action={deleteCompetition}>
              <input type="hidden" name="id" value={competition.id} />
              <Button type="submit" variant="danger">
                Delete competition
              </Button>
            </form>
          )
        }
      />

      {competition.notes && (
        <Card className="mb-6">
          <p className="text-sm text-stone-600 dark:text-stone-300">{competition.notes}</p>
        </Card>
      )}

      {isManager && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Add an entry</h2>
          <form action={addEntry} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input type="hidden" name="competitionId" value={competition.id} />
            <Select name="horseId" required defaultValue="">
              <option value="" disabled>
                Horse
              </option>
              {horses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
            <Select name="riderId" defaultValue="">
              <option value="">Rider (optional)</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <Input type="text" name="category" placeholder="Category / class" />
            <Button type="submit">Add entry</Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Entries</h2>
        {competition.entries.length === 0 ? (
          <EmptyState message="No entries yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 dark:border-neutral-800">
                  <th className="py-2 pr-4 font-medium">Horse</th>
                  <th className="py-2 pr-4 font-medium">Rider</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  {isManager && <th className="py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {competition.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-stone-100 last:border-0 dark:border-neutral-800/60">
                    <td className="py-2 pr-4 font-medium text-stone-700 dark:text-stone-200">
                      {entry.horse.name}
                    </td>
                    <td className="py-2 pr-4 text-stone-500 dark:text-stone-400">
                      {entry.rider?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-stone-500 dark:text-stone-400">
                      {entry.category ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {isManager ? (
                        <form action={updateEntryResult} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={entry.id} />
                          <input type="hidden" name="competitionId" value={competition.id} />
                          <Input
                            type="text"
                            name="result"
                            defaultValue={entry.result ?? ""}
                            placeholder="e.g. 1st place"
                            className="w-36 py-1"
                          />
                          <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                            Save
                          </Button>
                        </form>
                      ) : (
                        entry.result ?? "—"
                      )}
                    </td>
                    {isManager && (
                      <td className="py-2">
                        <form action={removeEntry}>
                          <input type="hidden" name="id" value={entry.id} />
                          <input type="hidden" name="competitionId" value={competition.id} />
                          <button className="text-red-500 hover:underline" type="submit">
                            Remove
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
