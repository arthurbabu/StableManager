import { fr, enUS } from "date-fns/locale";

export function getDateFnsLocale(locale: string) {
  return locale === "fr" ? fr : enUS;
}
