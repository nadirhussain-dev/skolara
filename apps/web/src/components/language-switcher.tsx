"use client";

import { LOCALES, LOCALE_META, useTranslation } from "@skolara/i18n";
import { cn } from "@skolara/ui";

/**
 * Each language is labelled in its own script — someone who only reads Urdu
 * can't be expected to find it behind the English word "Urdu".
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="sr-only">{t("common.language")}</span>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-current={locale === code}
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            locale === code
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100",
          )}
        >
          {LOCALE_META[code].nativeName}
        </button>
      ))}
    </div>
  );
}
