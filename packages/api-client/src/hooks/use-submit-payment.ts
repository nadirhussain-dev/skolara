import { useMutation } from "@tanstack/react-query";
import type { SubmitPaymentInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useSubmitPayment() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({
      studentId,
      input,
    }: {
      studentId: string;
      input: SubmitPaymentInput;
    }) => api.payments.submit(studentId, input),
  });
}
