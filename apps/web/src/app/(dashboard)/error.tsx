"use client";

import { Button, Card } from "@skolara/ui";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950/40">
        ⚠️
      </div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
        This page hit a snag
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Something went wrong loading this section. Your other pages are unaffected.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Card>
  );
}
