import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";

/**
 * The platform owner's health view.
 *
 * Polled rather than pushed: the numbers are only interesting while somebody
 * is looking at them, and a socket for something read this rarely would be
 * infrastructure in exchange for nothing. `refetchInterval` keeps it live on
 * screen; React Query pauses it when the tab is in the background.
 */
export function useHealthDetail(refetchMs = 15_000) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["health", "detail"],
    queryFn: () => api.health.detail(),
    refetchInterval: refetchMs,
    // A failure here is itself the signal, so don't sit on a stale success.
    retry: false,
  });
}
