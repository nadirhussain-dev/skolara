import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignStudentToBusInput,
  CreateBusInput,
  ReportBusLocationInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export const busesQueryKey = ["transport", "buses"] as const;

export function useBuses() {
  const api = useApiClient();
  return useQuery({
    queryKey: busesQueryKey,
    queryFn: () => api.transport.buses(),
  });
}

export function useCreateBus() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusInput) => api.transport.createBus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: busesQueryKey }),
  });
}

export function useAssignStudentToBus() {
  const api = useApiClient();
  return useMutation({
    mutationFn: ({ busId, input }: { busId: string; input: AssignStudentToBusInput }) =>
      api.transport.assignStudent(busId, input),
  });
}

export function useReportBusLocation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, input }: { busId: string; input: ReportBusLocationInput }) =>
      api.transport.reportLocation(busId, input),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["transport", "buses", vars.busId] }),
  });
}

export function useBusLocation(busId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["transport", "buses", busId],
    queryFn: () => api.transport.latestLocation(busId as string),
    enabled: Boolean(busId),
    refetchInterval: 15000,
  });
}

export function useBusForStudent(studentId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["transport", "student", studentId],
    queryFn: () => api.transport.forStudent(studentId as string),
    enabled: Boolean(studentId),
    refetchInterval: 15000,
  });
}
