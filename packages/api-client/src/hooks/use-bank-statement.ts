import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImportBankStatementInput } from "@skolara/types";
import { useApiClient } from "../context";

export const suggestedMatchesKey = ["bank-statement", "suggested-matches"] as const;

export function useSuggestedMatches() {
  const api = useApiClient();
  return useQuery({
    queryKey: suggestedMatchesKey,
    queryFn: () => api.bankStatement.suggestedMatches(),
  });
}

export function useImportBankStatement() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportBankStatementInput) => api.bankStatement.import(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suggestedMatchesKey }),
  });
}

export function useConfirmBankStatementMatch() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineId,
      paymentSubmissionId,
    }: {
      lineId: string;
      paymentSubmissionId: string;
    }) => api.bankStatement.confirmMatch(lineId, paymentSubmissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suggestedMatchesKey }),
  });
}
