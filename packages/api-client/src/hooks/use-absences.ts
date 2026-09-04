import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaveStatus, RequestAbsenceInput, ReviewAbsenceInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useMyAbsenceRequests() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["absences", "mine"],
    queryFn: () => api.absences.mine(),
  });
}

export function useAbsenceRequests(status?: LeaveStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["absences", "list", status ?? null],
    queryFn: () => api.absences.list(status),
  });
}

export function useRequestAbsence() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestAbsenceInput) => api.absences.request(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });
}

export function useReviewAbsence() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewAbsenceInput }) =>
      api.absences.review(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      // Approving rewrites attendance records, so anything showing a register
      // or a rate is now out of date.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCancelAbsenceRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.absences.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });
}
