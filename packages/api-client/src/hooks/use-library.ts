import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BorrowBookInput, CreateBookInput } from "@skolara/types";
import { useApiClient } from "../context";

export const booksQueryKey = ["library", "books"] as const;

export function useBooks() {
  const api = useApiClient();
  return useQuery({
    queryKey: booksQueryKey,
    queryFn: () => api.library.books(),
  });
}

export function useCreateBook() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookInput) => api.library.createBook(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: booksQueryKey }),
  });
}

export function useBorrowBook() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BorrowBookInput) => api.library.borrow(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: booksQueryKey }),
  });
}

export function useReturnBook() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => api.library.returnBook(loanId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: booksQueryKey }),
  });
}

export function useLoansForStudent(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["library", "loans", studentId],
    queryFn: () => api.library.loansForStudent(studentId as string),
    enabled: Boolean(studentId),
  });
}
