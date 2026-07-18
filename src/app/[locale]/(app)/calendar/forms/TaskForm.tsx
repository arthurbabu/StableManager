"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { TASK_TYPES, LOCATION_TASK_TYPES, REMINDER_TASK_TYPES } from "@/lib/constants";
import { createCareTask, updateCareTask, deleteCareTask } from "../../horses/actions";

type TaskType = (typeof TASK_TYPES)[number];

type ExistingTask = {
  id: string;
  horseId: string;
  type: TaskType;
  date: string; // yyyy-MM-dd
  startTime: string | null;
  endTime: string | null;
  assignedToId: string | null;
  notes: string | null;
  location: string | null;
  reminderDelayDays: number | null;
};

/** Defaults for a fresh task suggested from a prior reminder — not an edit. */
type TaskPrefill = {
  horseId: string;
  type: TaskType;
  assignedToId: string | null;
  notes: string | null;
};

export function TaskForm({
  date,
  startTime,
  endTime,
  task,
  prefill,
  horses,
  staff,
  onDone,
}: {
  date: string;
  startTime?: string;
  endTime?: string;
  task?: ExistingTask;
  prefill?: TaskPrefill;
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
  const [type, setType] = useState<TaskType | "">(task?.type ?? prefill?.type ?? "");
  const [repeatDaily, setRepeatDaily] = useState(false);
  const isEdit = !!task;
  const showLocation = LOCATION_TASK_TYPES.includes(type as (typeof LOCATION_TASK_TYPES)[number]);
  const showReminder = REMINDER_TASK_TYPES.includes(type as (typeof REMINDER_TASK_TYPES)[number]);
  const showRepeat = !isEdit && type === "FEEDING";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (task) formData.set("id", task.id);
    setError(null);
    startTransition(async () => {
      try {
        await (task ? updateCareTask : createCareTask)(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function handleDelete() {
    if (!task) return;
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("horseId", task.horseId);
    setError(null);
    startTransition(async () => {
      try {
        await deleteCareTask(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select name="horseId" required defaultValue={task?.horseId ?? prefill?.horseId ?? ""}>
        <option value="" disabled>
          {tCompetitionDetail("horse")}
        </option>
        {horses.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
      <Select name="type" required value={type} onChange={(e) => setType(e.target.value as TaskType)}>
        <option value="" disabled>
          {t("taskType")}
        </option>
        {TASK_TYPES.map((taskType) => (
          <option key={taskType} value={taskType}>
            {tTaskTypes(taskType)}
          </option>
        ))}
      </Select>
      <Input type="date" name="date" required defaultValue={task?.date ?? date} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="time" name="startTime" defaultValue={task?.startTime ?? startTime ?? ""} />
        <Input type="time" name="endTime" defaultValue={task?.endTime ?? endTime ?? ""} />
      </div>
      <Select name="assignedToId" defaultValue={task?.assignedToId ?? prefill?.assignedToId ?? ""}>
        <option value="">{t("unassigned")}</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      {showLocation && (
        <Input
          type="text"
          name="location"
          placeholder={type === "EXIT" ? t("destinationAddress") : t("provenanceAddress")}
          defaultValue={task?.location ?? ""}
        />
      )}
      {showReminder && (
        <div>
          <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">{t("reminderDelayDays")}</label>
          <Input
            type="number"
            name="reminderDelayDays"
            min={1}
            placeholder={t("reminderDelayDaysPlaceholder")}
            defaultValue={task?.reminderDelayDays ?? ""}
          />
        </div>
      )}
      {showRepeat && (
        <div className="space-y-2 rounded-lg bg-stone-50 p-2.5 dark:bg-neutral-800">
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
            <input
              type="checkbox"
              checked={repeatDaily}
              onChange={(e) => setRepeatDaily(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 dark:border-neutral-600"
            />
            {t("repeatDaily")}
          </label>
          {repeatDaily && (
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">{t("repeatUntil")}</label>
              <Input type="date" name="repeatUntil" required={repeatDaily} min={date} />
            </div>
          )}
        </div>
      )}
      <Input type="text" name="notes" placeholder={tCommon("notes")} defaultValue={task?.notes ?? prefill?.notes ?? ""} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        {isEdit && (
          <Button type="button" variant="danger" disabled={isPending} onClick={handleDelete} className="flex-1">
            {tCommon("remove")}
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isEdit ? tCommon("saveChanges") : t("addTaskButton")}
        </Button>
      </div>
    </form>
  );
}
