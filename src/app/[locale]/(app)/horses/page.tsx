import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Select } from "@/components/ui";
import { createHorse } from "./actions";

export default async function HorsesPage() {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const t = await getTranslations("Horses");
  const tCommon = await getTranslations("Common");
  const tSex = await getTranslations("HorseSex");

  const horses = await prisma.horse.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { careTasks: { where: { done: false } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("activeCount", { count: horses.filter((h) => h.active).length })}
      />

      {isManager && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            {t("addHorse")}
          </h2>
          <form action={createHorse} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Input type="text" name="name" placeholder={tCommon("name")} required className="col-span-2 md:col-span-1" />
            <Input type="text" name="breed" placeholder={t("breed")} />
            <Input type="text" name="color" placeholder={t("color")} />
            <Select name="sex" defaultValue="">
              <option value="">{t("sexOptional")}</option>
              <option value="MARE">{tSex("MARE")}</option>
              <option value="GELDING">{tSex("GELDING")}</option>
              <option value="STALLION">{tSex("STALLION")}</option>
            </Select>
            <Input type="date" name="dateOfBirth" />
            <Input type="text" name="notes" placeholder={tCommon("notes")} className="col-span-2 md:col-span-2" />
            <Button type="submit" className="col-span-2 md:col-span-4">
              {t("addHorseButton")}
            </Button>
          </form>
        </Card>
      )}

      {horses.length === 0 ? (
        <EmptyState message={t("noHorses")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {horses.map((horse) => (
            <Link key={horse.id} href={`/horses/${horse.id}`}>
              <Card className={`h-full transition hover:border-emerald-600 ${horse.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {horse.name}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {[horse.breed, horse.color].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {!horse.active && <Badge color="gray">{t("inactive")}</Badge>}
                </div>
                {horse._count.careTasks > 0 && (
                  <div className="mt-3">
                    <Badge color="amber">{t("openTasks", { count: horse._count.careTasks })}</Badge>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
