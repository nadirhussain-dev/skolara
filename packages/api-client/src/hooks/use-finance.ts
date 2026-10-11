import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateBudgetCategoryInput,
  CreateExpenseInput,
  ExpenseStatus,
  ReviewExpenseInput,
  SetBudgetInput,
} from "@skolara/types";
import { useApiClient } from "../context";

/** Everything under this key is refetched after any finance change. */
export const financeQueryKey = ["finance"] as const;

export function useFinanceOverview(month: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...financeQueryKey, "overview", month],
    queryFn: () => api.finance.overview(month),
  });
}

export function useBudgetCategories() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...financeQueryKey, "categories"],
    queryFn: () => api.finance.categories(),
  });
}

export function useExpenses(filter: { month?: string; status?: ExpenseStatus }) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...financeQueryKey, "expenses", filter.month ?? "all", filter.status ?? "all"],
    queryFn: () => api.finance.expenses(filter),
  });
}

function useFinanceMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKey }),
  });
}

export function useCreateBudgetCategory() {
  const api = useApiClient();
  return useFinanceMutation((input: CreateBudgetCategoryInput) => api.finance.createCategory(input));
}

export function useArchiveBudgetCategory() {
  const api = useApiClient();
  return useFinanceMutation((input: { id: string; archived: boolean }) =>
    api.finance.archiveCategory(input.id, input.archived),
  );
}

export function useSetBudget() {
  const api = useApiClient();
  return useFinanceMutation((input: SetBudgetInput) => api.finance.setBudget(input));
}

export function useCopyPreviousBudget() {
  const api = useApiClient();
  return useFinanceMutation((month: string) => api.finance.copyPreviousBudget(month));
}

export function useCreateExpense() {
  const api = useApiClient();
  return useFinanceMutation((input: CreateExpenseInput) => api.finance.createExpense(input));
}

export function useReviewExpense() {
  const api = useApiClient();
  return useFinanceMutation((input: { id: string } & ReviewExpenseInput) =>
    api.finance.reviewExpense(input.id, { decision: input.decision, note: input.note }),
  );
}

export function useDeleteExpense() {
  const api = useApiClient();
  return useFinanceMutation((id: string) => api.finance.deleteExpense(id));
}
