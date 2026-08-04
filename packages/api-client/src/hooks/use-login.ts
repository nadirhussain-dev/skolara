import { useMutation } from "@tanstack/react-query";
import type { LoginInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useLogin() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
  });
}
