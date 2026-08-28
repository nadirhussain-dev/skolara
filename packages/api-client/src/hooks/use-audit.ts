import { useInfiniteQuery } from "@tanstack/react-query";
import type { AuditOutcome } from "@skolara/types";
import { useApiClient } from "../context";

/**
 * The trail is append-only and grows without bound, so it's paged by cursor
 * rather than fetched whole.
 */
export function useAuditLogs(outcome?: AuditOutcome) {
  const api = useApiClient();
  return useInfiniteQuery({
    queryKey: ["audit-logs", outcome ?? "all"],
    queryFn: ({ pageParam }) =>
      api.audit.list({ outcome, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
