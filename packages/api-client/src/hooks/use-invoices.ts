import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";

export function useInvoicesForStudent(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["invoices", "student", studentId],
    queryFn: () => api.invoices.forStudent(studentId as string),
    enabled: Boolean(studentId),
  });
}
