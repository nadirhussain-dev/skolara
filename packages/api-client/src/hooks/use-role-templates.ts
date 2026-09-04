import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignRoleTemplateInput, UpsertRoleTemplateInput } from "@skolara/types";
import { useApiClient } from "../context";

/** The capability grid and presets. Static per deploy, so cached hard. */
export function useCapabilityCatalogue() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["role-templates", "catalogue"],
    queryFn: () => api.roleTemplates.catalogue(),
    staleTime: Infinity,
  });
}

export function useRoleTemplates() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["role-templates", "list"],
    queryFn: () => api.roleTemplates.list(),
  });
}

export function useRoleTemplate(id?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["role-templates", "detail", id],
    queryFn: () => api.roleTemplates.findOne(id!),
    enabled: Boolean(id),
  });
}

export function useCreateRoleTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertRoleTemplateInput) => api.roleTemplates.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role-templates"] }),
  });
}

export function useUpdateRoleTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertRoleTemplateInput }) =>
      api.roleTemplates.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role-templates"] }),
  });
}

export function useDeleteRoleTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.roleTemplates.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role-templates"] }),
  });
}

/**
 * Assigning changes what that account may reach on its next request, so the
 * user list is invalidated alongside the templates.
 */
export function useAssignRoleTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: AssignRoleTemplateInput }) =>
      api.roleTemplates.assign(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-templates"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
