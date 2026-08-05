import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SendMessageInput, StartThreadInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useThreads() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["messages", "threads"],
    queryFn: () => api.messaging.threads(),
  });
}

export function useThreadMessages(threadId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["messages", "threads", threadId],
    queryFn: () => api.messaging.messages(threadId as string),
    enabled: Boolean(threadId),
    refetchInterval: 5000,
  });
}

export function useStartThread() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartThreadInput) => api.messaging.startThread(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", "threads"] }),
  });
}

export function useSendMessage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, input }: { threadId: string; input: SendMessageInput }) =>
      api.messaging.send(threadId, input),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["messages", "threads", vars.threadId] }),
  });
}
