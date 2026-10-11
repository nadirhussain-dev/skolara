"use client";

import { useMySchool } from "@skolara/api-client";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { SkolaraLogo, SkolaraMark, cn } from "@skolara/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { isInMvpNav } from "./mvp-scope";
import { NAV_ITEMS } from "./nav-items";
import { safeHttpUrl } from "@/lib/safe-url";

function initials(...words: string[]) {
  return words
    .map((word) => word.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Inside a school the sidebar belongs to the school: its logo, its name, its
 * colour (via the brand variables SchoolTheme sets). Skolara appears only as
 * a small signature at the bottom. The platform owner, who has no school,
 * sees the Skolara logo instead.
 */
export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void } = {}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();
  const hasSchool = Boolean(user) && user?.role !== "SUPER_ADMIN";
  const { data: school } = useMySchool({ enabled: hasSchool });

  const groups = useMemo(() => {
    if (!user) return [];
    const visible = NAV_ITEMS.filter(
      (item) => item.roles.includes(user.role) && isInMvpNav(item.href),
    );
    const byGroup = new Map<MessageKey, typeof visible>();
    for (const item of visible) {
      const list = byGroup.get(item.groupKey) ?? [];
      list.push(item);
      byGroup.set(item.groupKey, list);
    }
    return Array.from(byGroup.entries());
  }, [user]);

  // The longest matching href wins, so "/school" (the dashboard) isn't also
  // highlighted on "/school/students", while "/school/students/42" still
  // highlights Students.
  const activeHref = useMemo(() => {
    let best: string | null = null;
    for (const [, items] of groups) {
      for (const { href } of items) {
        const matches = pathname === href || pathname.startsWith(`${href}/`);
        if (matches && (best === null || href.length > best.length)) best = href;
      }
    }
    return best;
  }, [groups, pathname]);

  // Following a link closes the drawer on small screens.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the route matters
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
    {open && (
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden print:hidden" />
    )}
    <aside
      id="app-sidebar"
      className={cn(
        "fixed inset-y-0 start-0 z-40 flex h-screen w-64 shrink-0 flex-col bg-brand-900 text-white transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:translate-x-0 print:hidden",
        open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full max-lg:rtl:translate-x-full",
      )}
    >
      <div className="px-4 py-5">
        {hasSchool ? (
          <Link href="/" className="flex items-center gap-3">
            {safeHttpUrl(school?.logoUrl) ? (
              // A school's own upload, from arbitrary storage hosts — not
              // worth routing through the image optimiser at 40px.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeHttpUrl(school?.logoUrl) ?? undefined}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-extrabold text-brand-700"
              >
                {school ? initials(...school.name.split(/\s+/)) : ""}
              </span>
            )}
            <span className="min-w-0 truncate text-[0.95rem] font-extrabold leading-tight">
              {school?.name ?? " "}
            </span>
          </Link>
        ) : (
          <Link href="/" aria-label="Skolara">
            <SkolaraLogo size={34} onDark />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map(([groupKey, items]) => (
          <div key={groupKey} className="mb-4">
            <p className="mb-1 px-3 text-[0.7rem] font-bold uppercase tracking-wider text-white/70">
              {t(groupKey)}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[2.5rem] items-center rounded-lg px-3 text-sm font-bold transition-colors",
                      active
                        ? "bg-white/[0.16] text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-3">
        <LanguageSwitcher tone="dark" />
        {hasSchool && (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-white/75">
            {t("common.poweredBy")}
            <SkolaraMark size={16} variant="reversed" aria-hidden />
          </span>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3 border-t border-white/15 px-4 py-4">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.16] text-xs font-extrabold"
          >
            {initials(user.firstName, user.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-white/75">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title={t("auth.signOut")}
            aria-label={t("auth.signOut")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
