import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarkAttendanceInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useStudentsByClass(classId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", "class", classId],
    queryFn: () => api.students.byClass(classId),
    enabled: Boolean(classId),
  });
}

export function useMarkAttendance() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => api.attendance.mark(input),
    // The day summary and the saved register both change.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** The register already saved for a class on a day (YYYY-MM-DD); empty if not taken. */
export function useClassAttendance(classId: string | undefined, date: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["attendance", "class", classId, date],
    queryFn: () => api.attendance.byClass(classId as string, date),
    enabled: Boolean(classId),
  });
}
