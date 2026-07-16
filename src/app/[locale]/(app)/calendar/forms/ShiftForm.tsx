"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { createShift, updateShift, deleteShift } from "../../staff/actions";

function addHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type ExistingShift = {
  id: string;
  userId: string;
  date: string; // yyyy-MM-dd
  startTime: string;
  endTime: string;
  notes: string | null;
};

export function ShiftForm({
  date,
  startTime = "08:00",
  shift,
  staff,
  onDone,
}: {
  date: string;
  startTime?: string;
  shift?: ExistingShift;
  staff: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("Staff");
  const tCommon = useTranslations("Common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!shift;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (shift) formData.set("id", shift.id);
    setError(null);
    startTransition(async () => {
      try {
        await (shift ? updateShift : createShift)(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function handleDelete() {
    if (!shift) return;
    const formData = new FormData();
    formData.set("id", shift.id);
    setError(null);
    startTransition(async () => {
      try {
        await deleteShift(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select name="userId" required defaultValue={shift?.userId ?? ""}>
        <option value="" disabled>
          {t("staffMember")}
        </option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Input type="date" name="date" required defaultValue={shift?.date ?? date} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="time" name="startTime" required defaultValue={shift?.startTime ?? startTime} />
        <Input type="time" name="endTime" required defaultValue={shift?.endTime ?? addHour(startTime)} />
      </div>
      <Input type="text" name="notes" placeholder={tCommon("notesOptional")} defaultValue={shift?.notes ?? ""} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        {isEdit && (
          <Button type="button" variant="danger" disabled={isPending} onClick={handleDelete} className="flex-1">
            {tCommon("remove")}
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isEdit ? tCommon("saveChanges") : t("addShiftButton")}
        </Button>
      </div>
    </form>
  );
}
