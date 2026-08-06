import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePayslipInput } from "@skolara/types";
import { useApiClient } from "../context";

export function usePayslipsForStaff(staffUserId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["payroll", "staff", staffUserId],
    queryFn: () => api.payroll.forStaff(staffUserId as string),
    enabled: Boolean(staffUserId),
  });
}

export function useMyPayslips() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["payroll", "mine"],
    queryFn: () => api.payroll.mine(),
  });
}

export function useGeneratePayslip() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayslipInput) => api.payroll.generate(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({
        queryKey: ["payroll", "staff", input.staffUserId],
      }),
  });
}
