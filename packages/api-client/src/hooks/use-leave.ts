import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaveStatus, RequestLeaveInput, ReviewLeaveInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useMyLeave() {
  const api = useApiClient();
  return useQuery({ queryKey: ["leave", "mine"], queryFn: () => api.leave.mine() });
}

export function useLeaveBalances() {
  const api = useApiClient();
  return useQuery({ queryKey: ["leave", "balances"], queryFn: () => api.leave.balances() });
}

export function useLeaveRequests(status?: LeaveStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["leave", "list", status ?? null],
    queryFn: () => api.leave.list(status),
  });
}

export function useRequestLeave() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestLeaveInput) => api.leave.request(input),
    // Filing a request consumes allowance, so balances are stale too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useReviewLeave() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewLeaveInput }) =>
      api.leave.review(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useCancelLeave() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.leave.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}
