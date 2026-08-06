import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateInvoiceInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useInvoicesForStudent(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["invoices", "student", studentId],
    queryFn: () => api.invoices.forStudent(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useCreateInvoice() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => api.invoices.create(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({
        queryKey: ["invoices", "student", input.studentId],
      }),
  });
}
