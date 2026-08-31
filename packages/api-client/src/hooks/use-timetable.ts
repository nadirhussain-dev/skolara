import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpsertTimetableEntryInput, CreatePeriodInput } from "@skolara/types";
import { useApiClient } from "../context";

export function usePeriods() {
  const api = useApiClient();
  return useQuery({ queryKey: ["timetable", "periods"], queryFn: () => api.timetable.periods() });
}

export function useCreatePeriod() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePeriodInput) => api.timetable.createPeriod(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useDeletePeriod() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.timetable.deletePeriod(id),
    // Deleting a period cascades to its lessons, so the whole timetable is stale.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useClassTimetable(classId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["timetable", "class", classId],
    queryFn: () => api.timetable.forClass(classId!),
    enabled: Boolean(classId),
  });
}

export function useMyTimetable() {
  const api = useApiClient();
  return useQuery({ queryKey: ["timetable", "mine"], queryFn: () => api.timetable.mine() });
}

export function useStudentTimetable(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["timetable", "student", studentId],
    queryFn: () => api.timetable.forStudent(studentId!),
    enabled: Boolean(studentId),
  });
}

export function useUpsertTimetableEntry() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertTimetableEntryInput) => api.timetable.upsertEntry(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useDeleteTimetableEntry() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.timetable.deleteEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}
