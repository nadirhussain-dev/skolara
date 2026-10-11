"use client";

import { useTranslation } from "@skolara/i18n";
import { Spinner } from "@skolara/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";
import { BroadcastBanner } from "@/components/broadcast-banner";
import { SchoolTheme } from "@/components/school-theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-slate-500">
        <Spinner className="h-5 w-5" />
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-brand-800 focus:shadow-lg"
      >
        {t("shell.skipToContent")}
      </a>
      <SchoolTheme />
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 lg:px-8 print:hidden">
          <button
            type="button"
            aria-label={t("shell.openMenu")}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:invisible"
          >
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <NotificationBell />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <BroadcastBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
