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

/** A school code as typed: lower-case letters, digits and hyphens, 3 to 40 long. */
export function isSchoolCode(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value);
}

/**
 * Looks a school up by its code before sign-in, so the screen can show the
 * school's name, logo and colour. Not found is an answer, not a failure, so
 * it is not retried.
 */
export function usePublicSchool(code: string) {
  const api = useApiClient();
  const normalised = code.trim().toLowerCase();
  return useQuery({
    queryKey: ["public-school", normalised],
    queryFn: () => api.schools.findPublic(normalised),
    enabled: isSchoolCode(normalised),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
