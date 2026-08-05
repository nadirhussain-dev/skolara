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

export function useDefaulterRisk(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "defaulter-risk", studentId],
    queryFn: () => api.analytics.defaulterRisk(studentId as string),
    enabled: Boolean(studentId),
  });
}
