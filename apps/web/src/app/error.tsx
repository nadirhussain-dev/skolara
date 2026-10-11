"use client";

import { Button } from "@skolara/ui";
import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage title="Something went wrong" body="This page failed to load. Your data is safe. Try again, or go back to the home page.">
      <Button onClick={reset} className="h-12 px-6 text-base">Try again</Button>
      {/* A full page load on purpose: this is the root error boundary, so the
          router itself may be in a broken state. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex h-12 items-center rounded-lg border border-brand-200 px-6 text-base font-bold text-brand-700 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300">
        Go to the home page
      </a>
    </StatusPage>
  );
}
