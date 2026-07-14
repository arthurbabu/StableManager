"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { createShift } from "../../staff/actions";

function addHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function AddShiftForm({
  date,
  startTime = "08:00",
  staff,
  onDone,
}: {
  date: string;
  startTime?: string;
  staff: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("Staff");
  const tCommon = useTranslations("Common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await createShift(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select name="userId" required defaultValue="">
        <option value="" disabled>
          {t("staffMember")}
        </option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Input type="date" name="date" required defaultValue={date} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="time" name="startTime" required defaultValue={startTime} />
        <Input type="time" name="endTime" required defaultValue={addHour(startTime)} />
      </div>
      <Input type="text" name="notes" placeholder={tCommon("notesOptional")} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {t("addShiftButton")}
      </Button>
    </form>
  );
}
