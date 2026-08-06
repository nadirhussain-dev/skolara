import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTeacherInput } from "@skolara/types";
import { useApiClient } from "../context";

export const teachersQueryKey = ["teachers"] as const;

export function useTeachers() {
  const api = useApiClient();
  return useQuery({
    queryKey: teachersQueryKey,
    queryFn: () => api.teachers.list(),
  });
}

export function useCreateTeacher() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeacherInput) => api.teachers.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teachersQueryKey }),
  });
}
