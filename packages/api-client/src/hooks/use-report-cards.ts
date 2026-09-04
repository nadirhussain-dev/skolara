import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "../context";

/**
 * Generating a report card writes a PDF to storage, so these are mutations
 * rather than queries — nothing here is safe to retry silently or cache.
 */
export function useGenerateReportCard() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({ studentId, term }: { studentId: string; term: string }) =>
      api.reportCards.forStudent(studentId, term),
  });
}

export function useGenerateClassReportCards() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({ classId, term }: { classId: string; term: string }) =>
      api.reportCards.forClass(classId, term),
  });
}
