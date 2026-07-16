"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { TASK_TYPES, LOCATION_TASK_TYPES } from "@/lib/constants";
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
  nextReminderDate: string | null; // yyyy-MM-dd
};

export function TaskForm({
  date,
  startTime,
  endTime,
  task,
  horses,
  staff,
  onDone,
}: {
  date: string;
  startTime?: string;
  endTime?: string;
  task?: ExistingTask;
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
  const [type, setType] = useState<TaskType | "">(task?.type ?? "");
  const isEdit = !!task;
  const showLocation = LOCATION_TASK_TYPES.includes(type as (typeof LOCATION_TASK_TYPES)[number]);
  const showReminder = type === "VET";

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
      <Select name="horseId" required defaultValue={task?.horseId ?? ""}>
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
      <Select name="assignedToId" defaultValue={task?.assignedToId ?? ""}>
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
          <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">{t("nextReminderDate")}</label>
          <Input type="date" name="nextReminderDate" defaultValue={task?.nextReminderDate ?? ""} />
        </div>
      )}
      <Input type="text" name="notes" placeholder={tCommon("notes")} defaultValue={task?.notes ?? ""} />
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
