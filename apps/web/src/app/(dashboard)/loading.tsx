"use client";

import { useTranslation } from "@skolara/i18n";
import { Spinner } from "@skolara/ui";

/**
 * A client component only so it can translate one word. The alternative is
 * resolving the locale server-side for a route-transition spinner, which is
 * more machinery than a spinner deserves.
 */
export default function DashboardLoading() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
      <Spinner className="h-5 w-5" />
      <p className="text-sm">{t("common.loading")}</p>
    </div>
  );
}
