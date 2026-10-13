import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";

export function useMyChildren(options: { enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", "mine"],
    queryFn: () => api.students.mine(),
    enabled: options.enabled ?? true,
  });
}
