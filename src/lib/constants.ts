export const TASK_TYPES = [
  "FEEDING",
  "GROOMING",
  "TRAINING",
  "FARRIER",
  "VET",
  "TURNOUT",
  "ENTRY",
  "EXIT",
  "OTHER",
] as const;

/** Task types that take a provenance/destination address instead of the usual notes. */
export const LOCATION_TASK_TYPES = ["ENTRY", "EXIT"] as const;
