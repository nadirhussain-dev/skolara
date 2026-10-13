"use client";

import { useTranslation } from "@skolara/i18n";
import { Button, Card } from "@skolara/ui";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-md text-center">
      <div aria-hidden className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v5M12 16.5v.5" />
          <path d="M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
        {t("shell.pageError")}
      </h1>
      <p role="alert" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {t("shell.pageErrorBody")}
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>{t("common.retry")}</Button>
      </div>
    </Card>
  );
}
