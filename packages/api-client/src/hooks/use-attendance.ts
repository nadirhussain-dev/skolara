import { useMutation, useQuery } from "@tanstack/react-query";
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
  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => api.attendance.mark(input),
  });
}
