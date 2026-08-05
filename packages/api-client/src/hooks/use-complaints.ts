import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddComplaintCommentInput,
  ComplaintStatus,
  CreateComplaintInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useComplaints() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["complaints", "all"],
    queryFn: () => api.complaints.list(),
  });
}

export function useMyComplaints() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["complaints", "mine"],
    queryFn: () => api.complaints.mine(),
  });
}

export function useComplaint(id: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["complaints", id],
    queryFn: () => api.complaints.findOne(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateComplaint() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintInput) => api.complaints.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useAddComplaintComment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddComplaintCommentInput }) =>
      api.complaints.addComment(id, input),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["complaints", vars.id] }),
  });
}

export function useUpdateComplaintStatus() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ComplaintStatus }) =>
      api.complaints.updateStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["complaints"] }),
  });
}
