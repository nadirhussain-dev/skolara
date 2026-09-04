import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddSupportCommentInput,
  CreateSupportTicketInput,
  SupportTicketStatus,
  UpdateSupportTicketInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useSupportTickets(status?: SupportTicketStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["support", "list", status ?? null],
    queryFn: () => api.support.list(status),
  });
}

export function useSupportTicket(id: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: () => api.support.findOne(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSupportTicket() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => api.support.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support"] }),
  });
}

export function useAddSupportComment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddSupportCommentInput }) =>
      api.support.addComment(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support"] }),
  });
}

export function useUpdateSupportTicket() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSupportTicketInput }) =>
      api.support.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support"] }),
  });
}
