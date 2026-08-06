import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateApiKeyInput } from "@skolara/types";
import { useApiClient } from "../context";

export const apiKeysQueryKey = ["api-keys"] as const;

export function useApiKeys() {
  const api = useApiClient();
  return useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: () => api.apiKeys.list(),
  });
}

export function useCreateApiKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) => api.apiKeys.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });
}

export function useRevokeApiKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.apiKeys.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });
}
