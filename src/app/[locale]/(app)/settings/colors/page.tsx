import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { TASK_TYPES, DEFAULT_TASK_COLOR } from "@/lib/constants";
import { Card, PageHeader, Button } from "@/components/ui";
import { setTaskTypeColor, resetTaskTypeColor } from "../actions";

export default async function TaskColorsPage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const t = await getTranslations("Settings");
  const tCommon = await getTranslations("Common");
  const tTaskTypes = await getTranslations("TaskTypes");

  const customColors = await prisma.taskTypeColor.findMany();
  const colorByType = new Map(customColors.map((c) => [c.type, c.color]));

  return (
    <div>
      <PageHeader title={t("colorsTitle")} subtitle={t("colorsSubtitle")} />

      <Card>
        <ul className="divide-y divide-stone-100 dark:divide-neutral-800">
          {TASK_TYPES.map((type) => {
            const isCustom = colorByType.has(type);
            const color = colorByType.get(type) ?? DEFAULT_TASK_COLOR;
            return (
              <li key={type} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  {tTaskTypes(type)}
                </span>
                <div className="flex items-center gap-2">
                  <form action={setTaskTypeColor} className="flex items-center gap-2">
                    <input type="hidden" name="type" value={type} />
                    <input
                      type="color"
                      name="color"
                      defaultValue={color}
                      className="h-9 w-14 cursor-pointer rounded border border-stone-300 dark:border-neutral-700"
                    />
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                      {tCommon("save")}
                    </Button>
                  </form>
                  {isCustom && (
                    <form action={resetTaskTypeColor}>
                      <input type="hidden" name="type" value={type} />
                      <button type="submit" className="text-xs text-red-500 hover:underline">
                        {t("resetColor")}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
