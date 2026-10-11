import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BulkInvoiceInput, CreateInvoiceInput, InvoiceFilter } from "@skolara/types";
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
    // The school-wide list and the finance figures move too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
      ]),
  });
}

export function useInvoices(filter: { status?: InvoiceFilter; classId?: string }) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["invoices", "list", filter.status ?? "ALL", filter.classId ?? "all"],
    queryFn: () => api.invoices.list(filter),
  });
}

export function useBulkInvoice() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkInvoiceInput) => api.invoices.createBulk(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      ]),
  });
}

export function useDefaulters(options: { enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["invoices", "defaulters"],
    queryFn: () => api.invoices.defaulters(),
    enabled: options.enabled ?? true,
  });
}

export function useSendFeeReminders() {
  const api = useApiClient();
  return useMutation({ mutationFn: (studentIds: string[]) => api.invoices.remind(studentIds) });
}
