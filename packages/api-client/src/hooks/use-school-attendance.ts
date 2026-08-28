import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../context";

/** School-wide register status for a single day, keyed YYYY-MM-DD. */
export function useSchoolDayAttendance(date: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["attendance", "school-day", date],
    queryFn: () => api.attendance.schoolDay(date),
    enabled: Boolean(date),
  });
}

export function useStudentParents(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["students", studentId, "parents"],
    queryFn: () => api.students.parents(studentId!),
    enabled: Boolean(studentId),
  });
}

export function useLinkParent(studentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parentUserId: string) => api.students.linkParent(studentId, parentUserId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["students", studentId, "parents"] }),
  });
}

export function useUnlinkParent(studentId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parentUserId: string) => api.students.unlinkParent(studentId, parentUserId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["students", studentId, "parents"] }),
  });
}
