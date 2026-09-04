"use client";

import { useTranslation } from "@skolara/i18n";
import { Spinner } from "@skolara/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";
import { BroadcastBanner } from "@/components/broadcast-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <BroadcastBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
