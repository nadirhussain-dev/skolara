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
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950/40">
        ⚠️
      </div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
        {t("shell.pageError")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("shell.pageErrorBody")}
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>{t("common.retry")}</Button>
      </div>
    </Card>
  );
}
