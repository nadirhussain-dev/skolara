import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddSyllabusTopicsInput,
  UpdateSyllabusTopicInput,
  UpsertLessonPlanInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useSyllabusTopics(
  classId?: string,
  filters: { subject?: string; term?: string } = {},
) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["lessons", "topics", classId, filters.subject ?? null, filters.term ?? null],
    queryFn: () => api.lessons.topicsForClass(classId!, filters),
    enabled: Boolean(classId),
  });
}

export function useSyllabusCoverage(classId?: string, term?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["lessons", "coverage", classId, term ?? null],
    queryFn: () => api.lessons.coverage(classId!, term),
    enabled: Boolean(classId),
  });
}

export function useAddSyllabusTopics() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSyllabusTopicsInput) => api.lessons.addTopics(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useUpdateSyllabusTopic() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSyllabusTopicInput }) =>
      api.lessons.updateTopic(id, input),
    // Marking a topic covered moves the coverage numbers too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useRemoveSyllabusTopic() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.lessons.removeTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useMyLessonPlans(range: { from?: string; to?: string } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["lessons", "plans", "mine", range.from ?? null, range.to ?? null],
    queryFn: () => api.lessons.minePlans(range),
  });
}

export function useClassLessonPlans(
  classId?: string,
  range: { from?: string; to?: string } = {},
) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["lessons", "plans", "class", classId, range.from ?? null, range.to ?? null],
    queryFn: () => api.lessons.plansForClass(classId!, range),
    enabled: Boolean(classId),
  });
}

export function useCreateLessonPlan() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertLessonPlanInput) => api.lessons.createPlan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useUpdateLessonPlan() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertLessonPlanInput }) =>
      api.lessons.updatePlan(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useRemoveLessonPlan() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.lessons.removePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });
}
