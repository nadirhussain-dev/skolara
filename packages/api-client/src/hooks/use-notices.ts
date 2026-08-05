import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateNoticeInput } from "@skolara/types";
import { useApiClient } from "../context";

export const noticesQueryKey = ["notices"] as const;

export function useNotices() {
  const api = useApiClient();
  return useQuery({
    queryKey: noticesQueryKey,
    queryFn: () => api.notices.list(),
  });
}

export function useCreateNotice() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoticeInput) => api.notices.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticesQueryKey }),
  });
}
