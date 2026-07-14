"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t("label")}>
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          aria-pressed={loc === locale}
          className={`rounded px-2 py-1 text-xs font-semibold uppercase transition ${
            loc === locale
              ? "bg-emerald-700 text-white"
              : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-neutral-800"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
