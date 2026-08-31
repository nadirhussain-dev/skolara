import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCalendarEventInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useCalendarEvents(from?: string, to?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["calendar", from ?? null, to ?? null],
    queryFn: () => api.calendar.list(from, to),
  });
}

export function useCreateCalendarEvent() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => api.calendar.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export function useDeleteCalendarEvent() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.calendar.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
}
