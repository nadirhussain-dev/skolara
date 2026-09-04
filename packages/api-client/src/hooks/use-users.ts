import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput, RoleType } from "@skolara/types";
import { useApiClient } from "../context";

export const usersQueryKey = ["users"] as const;

export function useUsers(role?: RoleType) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...usersQueryKey, role],
    queryFn: () => api.users.list(role),
  });
}

export function useCreateUser() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.users.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  });
}

export function useSetUserActive() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.users.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  });
}

/**
 * Colleagues' contact details. Returns staff only, so it's readable by
 * teachers as well as admins.
 */
export function useStaffDirectory() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["users", "staff-directory"],
    queryFn: () => api.users.staffDirectory(),
  });
}
