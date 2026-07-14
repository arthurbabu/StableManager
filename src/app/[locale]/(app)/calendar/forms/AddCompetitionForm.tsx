"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Textarea } from "@/components/ui";
import { createCompetition } from "../../competitions/actions";

export function AddCompetitionForm({
  date,
  onDone,
}: {
  date: string;
  onDone: () => void;
}) {
  const t = useTranslations("Competitions");
  const tCommon = useTranslations("Common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        // createCompetition redirects to the new competition on success;
        // let that redirect propagate instead of treating it as an error.
        await createCompetition(formData);
        onDone();
      } catch (err) {
        unstable_rethrow(err);
        setError(tCommon("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input type="text" name="name" placeholder={tCommon("name")} required />
      <Input type="text" name="location" placeholder={tCommon("location")} />
      <Input type="date" name="startDate" required defaultValue={date} />
      <Input type="date" name="endDate" placeholder={t("endDateOptional")} />
      <Textarea name="notes" placeholder={tCommon("notes")} rows={2} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {t("addCompetitionButton")}
      </Button>
    </form>
  );
}
