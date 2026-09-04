import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateBroadcastInput } from "@skolara/types";
import { useApiClient } from "../context";

/** What the signed-in user should currently see. Every role calls this. */
export function useActiveBroadcasts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["broadcasts", "active"],
    queryFn: () => api.broadcasts.active(),
    // A maintenance notice posted mid-session should appear without a reload.
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useAllBroadcasts() {
  const api = useApiClient();
  return useQuery({ queryKey: ["broadcasts", "all"], queryFn: () => api.broadcasts.list() });
}

export function useCreateBroadcast() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBroadcastInput) => api.broadcasts.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["broadcasts"] }),
  });
}

export function useWithdrawBroadcast() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.broadcasts.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["broadcasts"] }),
  });
}
