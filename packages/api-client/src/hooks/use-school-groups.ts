import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignSchoolToGroupInput, CreateSchoolGroupInput } from "@skolara/types";
import { useApiClient } from "../context";

export const schoolGroupsQueryKey = ["school-groups"] as const;

export function useSchoolGroups() {
  const api = useApiClient();
  return useQuery({
    queryKey: schoolGroupsQueryKey,
    queryFn: () => api.schoolGroups.list(),
  });
}

export function useSchoolsInGroup(groupId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["school-groups", groupId, "schools"],
    queryFn: () => api.schoolGroups.schools(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCreateSchoolGroup() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolGroupInput) => api.schoolGroups.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolGroupsQueryKey }),
  });
}

export function useAssignSchoolToGroup() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: AssignSchoolToGroupInput }) =>
      api.schoolGroups.assignSchool(groupId, input),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({
        queryKey: ["school-groups", vars.groupId, "schools"],
      }),
  });
}
