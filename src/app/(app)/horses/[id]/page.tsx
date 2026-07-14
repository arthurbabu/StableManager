import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Select, Textarea, Label } from "@/components/ui";
import {
  updateHorse,
  setHorseActive,
  createCareTask,
  toggleCareTaskDone,
  deleteCareTask,
} from "../actions";

const TASK_TYPES = ["FEEDING", "GROOMING", "TRAINING", "FARRIER", "VET", "TURNOUT", "OTHER"];

export default async function HorseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const { id } = await params;

  const [horse, staff] = await Promise.all([
    prisma.horse.findUnique({
      where: { id },
      include: {
        careTasks: {
          include: { assignedTo: true },
          orderBy: [{ done: "asc" }, { date: "asc" }],
        },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!horse) notFound();

  return (
    <div>
      <PageHeader
        title={horse.name}
        subtitle={[horse.breed, horse.color, horse.sex].filter(Boolean).join(" · ") || undefined}
        action={
          isManager && (
            <form action={setHorseActive}>
              <input type="hidden" name="id" value={horse.id} />
              <input type="hidden" name="active" value={(!horse.active).toString()} />
              <Button type="submit" variant="secondary">
                {horse.active ? "Mark inactive" : "Mark active"}
              </Button>
            </form>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Profile</h2>
            {isManager ? (
              <form action={updateHorse} className="space-y-3">
                <input type="hidden" name="id" value={horse.id} />
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={horse.name} required />
                </div>
                <div>
                  <Label htmlFor="breed">Breed</Label>
                  <Input id="breed" name="breed" defaultValue={horse.breed ?? ""} />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={horse.color ?? ""} />
                </div>
                <div>
                  <Label htmlFor="sex">Sex</Label>
                  <Select id="sex" name="sex" defaultValue={horse.sex ?? ""}>
                    <option value="">Unspecified</option>
                    <option value="MARE">Mare</option>
                    <option value="GELDING">Gelding</option>
                    <option value="STALLION">Stallion</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    defaultValue={horse.dateOfBirth ? format(horse.dateOfBirth, "yyyy-MM-dd") : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={horse.notes ?? ""} rows={3} />
                </div>
                <Button type="submit" className="w-full">
                  Save changes
                </Button>
              </form>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-400">Breed</dt>
                  <dd>{horse.breed ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">Color</dt>
                  <dd>{horse.color ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">Sex</dt>
                  <dd>{horse.sex ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">Date of birth</dt>
                  <dd>{horse.dateOfBirth ? format(horse.dateOfBirth, "MMM d, yyyy") : "—"}</dd>
                </div>
                {horse.notes && (
                  <div>
                    <dt className="text-stone-400">Notes</dt>
                    <dd className="mt-1">{horse.notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {isManager && (
            <Card>
              <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
                Add a care task
              </h2>
              <form action={createCareTask} className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <input type="hidden" name="horseId" value={horse.id} />
                <Select name="type" required defaultValue="">
                  <option value="" disabled>
                    Task type
                  </option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Input type="date" name="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                <Select name="assignedToId" defaultValue="">
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Input type="text" name="notes" placeholder="Notes" />
                <Button type="submit" className="col-span-2 md:col-span-4">
                  Add task
                </Button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
              Care schedule
            </h2>
            {horse.careTasks.length === 0 ? (
              <EmptyState message="No care tasks yet." />
            ) : (
              <ul className="space-y-2">
                {horse.careTasks.map((task) => {
                  const canToggle = isManager || task.assignedToId === user.id;
                  return (
                    <li
                      key={task.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-sm ${
                        task.done
                          ? "bg-stone-50 text-stone-400 dark:bg-neutral-800/50"
                          : "bg-stone-50 dark:bg-neutral-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {canToggle ? (
                          <form action={toggleCareTaskDone}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="horseId" value={horse.id} />
                            <input type="hidden" name="done" value={(!task.done).toString()} />
                            <button
                              type="submit"
                              className={`h-5 w-5 rounded-full border-2 ${
                                task.done
                                  ? "border-emerald-600 bg-emerald-600"
                                  : "border-stone-300 dark:border-neutral-600"
                              }`}
                              aria-label={task.done ? "Mark not done" : "Mark done"}
                            />
                          </form>
                        ) : (
                          <span
                            className={`h-5 w-5 rounded-full border-2 ${
                              task.done ? "border-emerald-600 bg-emerald-600" : "border-stone-300"
                            }`}
                          />
                        )}
                        <div className={task.done ? "line-through" : ""}>
                          <span className="font-medium text-stone-700 dark:text-stone-200">
                            {format(task.date, "MMM d")}
                          </span>{" "}
                          <Badge>{task.type}</Badge>
                          {task.assignedTo && (
                            <span className="ml-2 text-stone-400">{task.assignedTo.name}</span>
                          )}
                          {task.notes && <p className="text-stone-400">{task.notes}</p>}
                        </div>
                      </div>
                      {isManager && (
                        <form action={deleteCareTask}>
                          <input type="hidden" name="id" value={task.id} />
                          <input type="hidden" name="horseId" value={horse.id} />
                          <button className="text-red-500 hover:underline" type="submit">
                            Remove
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
