import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateClassInput } from "@skolara/types";
import { useApiClient } from "../context";

// Shared with the pages that still query classes inline, so they stay in sync.
export const classesQueryKey = ["classes"] as const;

export function useClasses(options: { enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: classesQueryKey,
    queryFn: () => api.classes.list(),
    enabled: options.enabled ?? true,
  });
}

export function useCreateClass() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassInput) => api.classes.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classesQueryKey }),
  });
}

export function useClassTeachers(classId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...classesQueryKey, classId, "teachers"],
    queryFn: () => api.classes.teachers(classId as string),
    enabled: Boolean(classId),
  });
}

/** Assigns or removes a teacher; the server answers with the class's new list. */
export function useSetClassTeacher(classId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { teacherUserId: string; assigned: boolean }) =>
      input.assigned
        ? api.classes.assignTeacher(classId, input.teacherUserId)
        : api.classes.unassignTeacher(classId, input.teacherUserId),
    onSuccess: (teachers) => queryClient.setQueryData([...classesQueryKey, classId, "teachers"], teachers),
  });
}
