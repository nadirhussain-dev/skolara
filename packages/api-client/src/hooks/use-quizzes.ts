import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateQuizInput,
  ReplaceQuizQuestionsInput,
  SaveQuizAnswerInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useClassQuizzes(classId?: string, subject?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["quizzes", "class", classId, subject ?? null],
    queryFn: () => api.quizzes.forClass(classId!, subject),
    enabled: Boolean(classId),
  });
}

export function useQuiz(id?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["quizzes", "detail", id],
    queryFn: () => api.quizzes.findOne(id!),
    enabled: Boolean(id),
  });
}

export function useQuizResults(id?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["quizzes", "results", id],
    queryFn: () => api.quizzes.results(id!),
    enabled: Boolean(id),
  });
}

export function useStudentQuizzes(studentId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["quizzes", "student", studentId],
    queryFn: () => api.quizzes.availableForStudent(studentId!),
    enabled: Boolean(studentId),
  });
}

export function useStudentQuizAttempts(studentId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["quizzes", "attempts", studentId],
    queryFn: () => api.quizzes.attemptsForStudent(studentId!),
    enabled: Boolean(studentId),
  });
}

export function useCreateQuiz() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizInput) => api.quizzes.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useReplaceQuizQuestions() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReplaceQuizQuestionsInput }) =>
      api.quizzes.replaceQuestions(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function usePublishQuiz() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.quizzes.publish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useDeleteQuiz() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.quizzes.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useStartQuizAttempt() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => api.quizzes.startAttempt(quizId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

/**
 * Saves one selection. Deliberately does not invalidate anything: the answer
 * is already on screen, and refetching the paper mid-attempt would fight the
 * student's own state.
 */
export function useSaveQuizAnswer() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: SaveQuizAnswerInput }) =>
      api.quizzes.saveAnswer(attemptId, input),
  });
}

export function useSubmitQuizAttempt() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => api.quizzes.submitAttempt(attemptId),
    // A submitted attempt changes the quiz list, the gradebook and the results
    // table, so invalidate broadly rather than guessing.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["grades"] });
    },
  });
}
