import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublishStudyMaterialInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useClassStudyMaterials(classId?: string, subject?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["study-materials", "class", classId, subject ?? null],
    queryFn: () => api.studyMaterials.forClass(classId!, subject),
    enabled: Boolean(classId),
  });
}

export function useClassStudyMaterialSubjects(classId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["study-materials", "subjects", classId],
    queryFn: () => api.studyMaterials.subjectsForClass(classId!),
    enabled: Boolean(classId),
  });
}

export function useStudentStudyMaterials(studentId?: string, subject?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["study-materials", "student", studentId, subject ?? null],
    queryFn: () => api.studyMaterials.forStudent(studentId!, subject),
    enabled: Boolean(studentId),
  });
}

export function usePublishStudyMaterial() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishStudyMaterialInput) => api.studyMaterials.publish(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-materials"] }),
  });
}

export function useWithdrawStudyMaterial() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studyMaterials.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-materials"] }),
  });
}
