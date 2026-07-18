export const TASK_TYPES = [
  "FEEDING",
  "FARRIER",
  "VET",
  "HORSE_WALKER",
  "RIDE",
  "TROTTING",
  "LUNGE",
  "PADDOCK",
  "ENTRY",
  "EXIT",
  "OTHER",
] as const;

/** Task types that take a provenance/destination address instead of the usual notes. */
export const LOCATION_TASK_TYPES = ["ENTRY", "EXIT"] as const;

/** Task types that support a "next reminder" follow-up delay. */
export const REMINDER_TASK_TYPES = ["VET", "FARRIER"] as const;

/** Default task color (matches --cal-task's light-mode value) when a type has no custom color set. */
export const DEFAULT_TASK_COLOR = "#1baf7a";
