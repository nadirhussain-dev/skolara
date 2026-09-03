import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpsertLiveClassInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useClassLiveClasses(classId?: string, includePast = false) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["live-classes", "class", classId, includePast],
    queryFn: () => api.liveClasses.forClass(classId!, includePast),
    enabled: Boolean(classId),
  });
}

export function useMyLiveClasses(includePast = false) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["live-classes", "mine", includePast],
    queryFn: () => api.liveClasses.mine(includePast),
  });
}

/**
 * A student's sessions. Refetched on an interval because the join link is
 * released by the server when the window opens — without this the app would
 * show "not yet" until the student pulled to refresh.
 */
export function useStudentLiveClasses(studentId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["live-classes", "student", studentId],
    queryFn: () => api.liveClasses.forStudent(studentId!),
    enabled: Boolean(studentId),
    refetchInterval: 60_000,
  });
}

export function useCreateLiveClass() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertLiveClassInput) => api.liveClasses.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-classes"] }),
  });
}

export function useUpdateLiveClass() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertLiveClassInput }) =>
      api.liveClasses.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-classes"] }),
  });
}

export function useRemoveLiveClass() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.liveClasses.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-classes"] }),
  });
}
