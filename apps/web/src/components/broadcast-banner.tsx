"use client";

import { useActiveBroadcasts } from "@skolara/api-client";

/**
 * Platform-wide notices, shown above every dashboard page.
 *
 * Rendered for every role — that's the point of a broadcast. Silent when
 * there's nothing to say, and silent on error too: a failed banner fetch
 * shouldn't push an error into a page that was otherwise fine.
 */
export function BroadcastBanner() {
  const { data: broadcasts } = useActiveBroadcasts();
  if (!broadcasts || broadcasts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {broadcasts.map((broadcast) => (
        <div
          key={broadcast.id}
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-900 dark:bg-brand-950/40"
        >
          <p className="font-medium text-brand-800 dark:text-brand-200">{broadcast.title}</p>
          <p className="text-brand-700 dark:text-brand-300">{broadcast.body}</p>
        </div>
      ))}
    </div>
  );
}
