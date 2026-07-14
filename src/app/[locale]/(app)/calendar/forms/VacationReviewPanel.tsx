"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { getDateFnsLocale } from "@/i18n/dateLocale";
import { Badge, Button } from "@/components/ui";
import { reviewVacation } from "../../staff/vacations/actions";

const statusColor = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
} as const;

export function VacationReviewPanel({
  vacation,
  isManager,
  onDone,
}: {
  vacation: {
    id: string;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    user: { name: string };
  };
  isManager: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("Vacations");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("VacationStatus");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    const formData = new FormData();
    formData.set("id", vacation.id);
    formData.set("decision", decision);
    setError(null);
    startTransition(async () => {
      try {
        await reviewVacation(formData);
        onDone();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{vacation.user.name}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          {format(vacation.startDate, "d MMM yyyy", { locale: dateLocale })} –{" "}
          {format(vacation.endDate, "d MMM yyyy", { locale: dateLocale })}
        </p>
        {vacation.reason && (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{vacation.reason}</p>
        )}
        <div className="mt-3">
          <Badge color={statusColor[vacation.status]}>{tStatus(vacation.status)}</Badge>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {isManager && vacation.status === "PENDING" && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => decide("APPROVED")}
            className="flex-1"
          >
            {t("approve")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isPending}
            onClick={() => decide("REJECTED")}
            className="flex-1"
          >
            {t("reject")}
          </Button>
        </div>
      )}
    </div>
  );
}
