"use client";

import { Button, Card } from "@skolara/ui";
import { useEffect } from "react";

export default function GlobalError({
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950/40">
          ⚠️
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Something went wrong
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {/* Hard navigation is deliberate here: this is the root error boundary, so
              the React tree (including the router) may itself be in a broken state. */}
          {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </main>
  );
}
