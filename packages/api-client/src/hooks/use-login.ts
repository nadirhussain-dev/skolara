import { useMutation } from "@tanstack/react-query";
import type { ForgotPasswordInput, LoginInput, ResetPasswordInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useLogin() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
  });
}

export function useForgotPassword() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => api.auth.forgotPassword(input),
  });
}

export function useResetPassword() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api.auth.resetPassword(input),
  });
}
