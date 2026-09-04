import { useMutation } from "@tanstack/react-query";
import type { IssueCertificateInput } from "@skolara/types";
import { useApiClient } from "../context";

/** Issuing writes a PDF to storage, so this is a mutation rather than a query. */
export function useIssueCertificate() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: IssueCertificateInput) => api.certificates.issue(input),
  });
}
