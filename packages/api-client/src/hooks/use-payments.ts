import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentSubmissionStatus, ReviewPaymentInput } from "@skolara/types";
import { useApiClient } from "../context";

export function paymentQueueKey(status?: PaymentSubmissionStatus) {
  return ["payments", "queue", status ?? "ALL"] as const;
}

export function usePaymentQueue(status?: PaymentSubmissionStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: paymentQueueKey(status),
    queryFn: () => api.payments.queue(status),
  });
}

export function useReviewPayment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewPaymentInput }) =>
      api.payments.review(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payments", "queue"] }),
  });
}
