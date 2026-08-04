import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSchoolInput } from "@skolara/types";
import { useApiClient } from "../context";

export const schoolsQueryKey = ["schools"] as const;

export function useSchools() {
  const api = useApiClient();
  return useQuery({
    queryKey: schoolsQueryKey,
    queryFn: () => api.schools.list(),
  });
}

export function useCreateSchool() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolInput) => api.schools.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}
