import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpsertGradeEntryInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useClassGrades(classId: string, term?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["grades", "class", classId, term ?? "ALL"],
    queryFn: () => api.grades.forClass(classId, term),
    enabled: Boolean(classId),
  });
}

export function useStudentGrades(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["grades", "student", studentId],
    queryFn: () => api.grades.forStudent(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useUpsertGrade() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertGradeEntryInput) => api.grades.upsert(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({
        queryKey: ["grades", "class", input.classId],
      }),
  });
}
