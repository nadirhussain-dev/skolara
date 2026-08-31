import { useMutation, useQuery } from "@tanstack/react-query";
import type { RegisterSchoolInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useRegisterSchool() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (input: RegisterSchoolInput) => api.schools.register(input),
  });
}

/**
 * Checks a subdomain while the user types. Only fires once the value is long
 * enough to be valid, so a half-typed name doesn't render as "taken".
 */
export function useSubdomainAvailability(subdomain: string) {
  const api = useApiClient();
  const isCandidate = /^[a-z0-9-]{3,40}$/.test(subdomain);
  return useQuery({
    queryKey: ["subdomain-available", subdomain],
    queryFn: () => api.schools.subdomainAvailable(subdomain),
    enabled: isCandidate,
    staleTime: 30_000,
  });
}
