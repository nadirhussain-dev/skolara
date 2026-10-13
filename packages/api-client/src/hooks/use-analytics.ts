import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";

export function usePlatformAnalytics() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: () => api.analytics.platform(),
  });
}

export function useSchoolAnalytics() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "school"],
    queryFn: () => api.analytics.school(),
  });
}

/** The admin dashboard home: what is waiting on the school today. */
export function useSchoolToday() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "school", "today"],
    queryFn: () => api.analytics.schoolToday(),
    // The verification queue moves while the page is open.
    refetchInterval: 60_000,
  });
}

export function useDefaulterRisk(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "defaulter-risk", studentId],
    queryFn: () => api.analytics.defaulterRisk(studentId as string),
    enabled: Boolean(studentId),
  });
}
