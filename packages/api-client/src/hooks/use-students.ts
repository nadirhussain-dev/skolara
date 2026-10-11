import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdmitStudentInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useStudent(id: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", id],
    queryFn: () => api.students.findOne(id as string),
    enabled: Boolean(id),
  });
}

export function useAdmitStudent() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdmitStudentInput) => api.students.admit(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useAssignStudentClass() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, classId }: { id: string; classId: string }) =>
      api.students.assignClass(id, classId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

/** Every student in the school, or one class when `classId` is given. */
export function useStudents(classId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", "list", classId ?? "all"],
    queryFn: () => (classId ? api.students.byClass(classId) : api.students.all()),
  });
}
