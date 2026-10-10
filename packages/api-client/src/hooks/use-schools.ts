import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSchoolInput,
  UpdateBrandingInput,
  UpdateCommunicationInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export const schoolsQueryKey = ["schools"] as const;

/**
 * The signed-in user's own school. Pass `enabled: false` for users who have
 * none — the platform owner — so the request isn't made just to fail.
 */
export function useMySchool(options: { enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["schools", "me"],
    queryFn: () => api.schools.mine(),
    enabled: options.enabled ?? true,
  });
}

export function useUpdateBranding() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBrandingInput }) =>
      api.schools.updateBranding(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
    },
  });
}

export function useUpdateCommunication() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCommunicationInput }) =>
      api.schools.updateCommunication(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
    },
  });
}

export function useSchools() {
  const api = useApiClient();
  return useQuery({
    queryKey: schoolsQueryKey,
    queryFn: () => api.schools.list(),
  });
}

export function useCreateSchool() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolInput) => api.schools.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}

export function useApproveSchool() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.schools.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}

export function useRejectSchool() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.schools.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}
