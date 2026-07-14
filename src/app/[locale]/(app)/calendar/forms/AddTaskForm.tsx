"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { TASK_TYPES } from "@/lib/constants";
import { createCareTask } from "../../horses/actions";

export function AddTaskForm({
  date,
  horses,
  staff,
  onDone,
}: {
  date: string;
  horses: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("HorseDetail");
  const tCommon = useTranslations("Common");
  const tTaskTypes = useTranslations("TaskTypes");
  const tCompetitionDetail = useTranslations("CompetitionDetail");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await createCareTask(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select name="horseId" required defaultValue="">
        <option value="" disabled>
          {tCompetitionDetail("horse")}
        </option>
        {horses.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
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
      <Input type="date" name="date" required defaultValue={date} />
      <Select name="assignedToId" defaultValue="">
        <option value="">{t("unassigned")}</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Input type="text" name="notes" placeholder={tCommon("notes")} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {t("addTaskButton")}
      </Button>
    </form>
  );
}
