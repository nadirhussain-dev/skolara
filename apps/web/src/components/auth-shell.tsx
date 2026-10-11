"use client";

import { useTranslation } from "@skolara/i18n";
import type { PublicSchool } from "@skolara/types";
import { SkolaraLogo, SkolaraMark } from "@skolara/ui";
import { brandCssVariables, isHexColor } from "@skolara/utils";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { safeHttpUrl } from "@/lib/safe-url";

/**
 * Themes the page with a school's colour while it is on screen, and puts the
 * Skolara default back on the way out.
 */
function useBrandColor(color: string | null | undefined) {
  useEffect(() => {
    if (!isHexColor(color)) return;
    const root = document.documentElement;
    const variables = brandCssVariables(color);
    for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(variables)) root.style.removeProperty(name);
    };
  }, [color]);
}

/**
 * The frame around sign-in, password reset and sign-up: a brand panel beside
 * the form on wide screens, a compact header above it on phones. Once a
 * school is known the panel is the school's, in its own colour, and Skolara
 * steps back to a signature.
 */
export function AuthShell({
  school,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  school?: PublicSchool | null;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  useBrandColor(school?.primaryColor);
  const logo = safeHttpUrl(school?.logoUrl);
  const initials = (school?.name ?? "").split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  const identity = school ? (
    <span className="flex items-center gap-3">
      {logo ? (
        // A school's own upload from arbitrary storage hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-12 w-12 rounded-xl bg-white object-contain" />
      ) : (
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-base font-extrabold text-brand-700">{initials}</span>
      )}
      <span className="text-lg font-extrabold leading-tight">{school.name}</span>
    </span>
  ) : (
    <SkolaraLogo size={40} onDark />
  );

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 lg:flex-row">
      <aside className="flex flex-col justify-between gap-8 bg-brand-900 px-6 py-6 text-white lg:w-[42%] lg:max-w-xl lg:px-12 lg:py-12">
        <Link href="/" aria-label="Skolara" className="self-start rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          {identity}
        </Link>
        <div className="hidden lg:block">
          <p className="text-4xl font-extrabold leading-tight tracking-tight">{t("auth.tagline")}</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">{t("auth.taglineBody")}</p>
        </div>
        <div className="hidden items-center justify-between lg:flex">
          {school ? (
            <span className="flex items-center gap-2 text-xs font-semibold text-white/75">
              {t("common.poweredBy")}
              <SkolaraMark size={18} variant="reversed" aria-hidden />
              <span className="lowercase tracking-tight">skolara</span>
            </span>
          ) : (
            <span />
          )}
          <LanguageSwitcher tone="dark" />
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className={wide ? "w-full max-w-xl" : "w-full max-w-sm"}>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
          <div className="mt-8 lg:hidden"><LanguageSwitcher /></div>
        </div>
      </main>
    </div>
  );
}

/** A password box with a show/hide button. */
export function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  id?: string;
  autoComplete?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        value={value}
        maxLength={72}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pe-12 ps-3 text-sm text-slate-900 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={visible}
        className="absolute end-0 top-0 flex h-full w-11 items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-400"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
