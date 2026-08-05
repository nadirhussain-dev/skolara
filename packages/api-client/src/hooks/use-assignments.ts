import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAssignmentInput,
  GradeAssignmentInput,
  SubmitAssignmentInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useClassAssignments(classId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["assignments", "class", classId],
    queryFn: () => api.assignments.forClass(classId),
    enabled: Boolean(classId),
  });
}

export function useStudentAssignments(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["assignments", "student", studentId],
    queryFn: () => api.assignments.forStudent(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useAssignmentSubmissions(assignmentId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["assignments", assignmentId, "submissions"],
    queryFn: () => api.assignments.submissions(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useCreateAssignment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => api.assignments.create(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ["assignments", "class", input.classId] }),
  });
}

export function useSubmitAssignment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      studentId,
      input,
    }: {
      assignmentId: string;
      studentId: string;
      input: SubmitAssignmentInput;
    }) => api.assignments.submit(assignmentId, studentId, input),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({
        queryKey: ["assignments", "student", vars.studentId],
      }),
  });
}

export function useGradeAssignment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      submissionId,
      input,
    }: {
      submissionId: string;
      input: GradeAssignmentInput;
    }) => api.assignments.grade(submissionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });
}
