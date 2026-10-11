import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../context";

export const notificationsQueryKey = ["notifications"] as const;

/** The signed-in user's inbox. Polls so the bell stays current without a socket. */
export function useNotifications(options: { enabled?: boolean; refetchInterval?: number } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => api.notifications.list(),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? 60_000,
  });
}

/** Marks the given notifications read, or all of them when called with nothing. */
export function useMarkNotificationsRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.notifications.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}
