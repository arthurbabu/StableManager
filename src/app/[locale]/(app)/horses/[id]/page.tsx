import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Select, Textarea, Label } from "@/components/ui";
import {
  updateHorse,
  setHorseActive,
  createCareTask,
  toggleCareTaskDone,
  deleteCareTask,
} from "../actions";

const TASK_TYPES = ["FEEDING", "GROOMING", "TRAINING", "FARRIER", "VET", "TURNOUT", "OTHER"] as const;

export default async function HorseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const { id } = await params;
  const t = await getTranslations("HorseDetail");
  const tCommon = await getTranslations("Common");
  const tHorses = await getTranslations("Horses");
  const tSex = await getTranslations("HorseSex");
  const tTaskTypes = await getTranslations("TaskTypes");
  const locale = await getLocale();
  const dateLocale = getDateFnsLocale(locale);

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
        subtitle={[horse.breed, horse.color, horse.sex ? tSex(horse.sex) : null].filter(Boolean).join(" · ") || undefined}
        action={
          isManager && (
            <form action={setHorseActive}>
              <input type="hidden" name="id" value={horse.id} />
              <input type="hidden" name="active" value={(!horse.active).toString()} />
              <Button type="submit" variant="secondary">
                {horse.active ? t("markInactive") : t("markActive")}
              </Button>
            </form>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">{t("profile")}</h2>
            {isManager ? (
              <form action={updateHorse} className="space-y-3">
                <input type="hidden" name="id" value={horse.id} />
                <div>
                  <Label htmlFor="name">{tCommon("name")}</Label>
                  <Input id="name" name="name" defaultValue={horse.name} required />
                </div>
                <div>
                  <Label htmlFor="breed">{tHorses("breed")}</Label>
                  <Input id="breed" name="breed" defaultValue={horse.breed ?? ""} />
                </div>
                <div>
                  <Label htmlFor="color">{tHorses("color")}</Label>
                  <Input id="color" name="color" defaultValue={horse.color ?? ""} />
                </div>
                <div>
                  <Label htmlFor="sex">{t("sex")}</Label>
                  <Select id="sex" name="sex" defaultValue={horse.sex ?? ""}>
                    <option value="">{t("unspecified")}</option>
                    <option value="MARE">{tSex("MARE")}</option>
                    <option value="GELDING">{tSex("GELDING")}</option>
                    <option value="STALLION">{tSex("STALLION")}</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">{tHorses("dateOfBirth")}</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    defaultValue={horse.dateOfBirth ? format(horse.dateOfBirth, "yyyy-MM-dd") : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">{tCommon("notes")}</Label>
                  <Textarea id="notes" name="notes" defaultValue={horse.notes ?? ""} rows={3} />
                </div>
                <Button type="submit" className="w-full">
                  {tCommon("saveChanges")}
                </Button>
              </form>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-400">{tHorses("breed")}</dt>
                  <dd>{horse.breed ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">{tHorses("color")}</dt>
                  <dd>{horse.color ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">{t("sex")}</dt>
                  <dd>{horse.sex ? tSex(horse.sex) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">{tHorses("dateOfBirth")}</dt>
                  <dd>{horse.dateOfBirth ? format(horse.dateOfBirth, "d MMM yyyy", { locale: dateLocale }) : "—"}</dd>
                </div>
                {horse.notes && (
                  <div>
                    <dt className="text-stone-400">{tCommon("notes")}</dt>
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
                {t("addCareTask")}
              </h2>
              <form action={createCareTask} className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <input type="hidden" name="horseId" value={horse.id} />
                <Select name="type" required defaultValue="">
                  <option value="" disabled>
                    {t("taskType")}
                  </option>
                  {TASK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tTaskTypes(type)}
                    </option>
                  ))}
                </Select>
                <Input type="date" name="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                <Select name="assignedToId" defaultValue="">
                  <option value="">{t("unassigned")}</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Input type="text" name="notes" placeholder={tCommon("notes")} />
                <Button type="submit" className="col-span-2 md:col-span-4">
                  {t("addTaskButton")}
                </Button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
              {t("careSchedule")}
            </h2>
            {horse.careTasks.length === 0 ? (
              <EmptyState message={t("noTasks")} />
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
                              aria-label={task.done ? t("markNotDone") : t("markDone")}
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
                            {format(task.date, "d MMM", { locale: dateLocale })}
                          </span>{" "}
                          <Badge>{tTaskTypes(task.type)}</Badge>
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
                            {tCommon("remove")}
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
