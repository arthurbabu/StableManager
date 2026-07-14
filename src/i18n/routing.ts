import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

/** Builds an app-relative href for a given locale, honoring the "as-needed" prefix rule. */
export function localizedHref(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
