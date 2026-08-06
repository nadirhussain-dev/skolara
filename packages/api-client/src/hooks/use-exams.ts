import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateExamInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useClassExams(classId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["exams", "class", classId],
    queryFn: () => api.exams.forClass(classId),
    enabled: Boolean(classId),
  });
}

export function useExamRankList(examId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["exams", examId, "rank-list"],
    queryFn: () => api.exams.rankList(examId as string),
    enabled: Boolean(examId),
  });
}

export function useCreateExam() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExamInput) => api.exams.create(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ["exams", "class", input.classId] }),
  });
}
