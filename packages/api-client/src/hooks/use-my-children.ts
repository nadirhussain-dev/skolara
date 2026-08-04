import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";

export function useMyChildren() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", "mine"],
    queryFn: () => api.students.mine(),
  });
}
