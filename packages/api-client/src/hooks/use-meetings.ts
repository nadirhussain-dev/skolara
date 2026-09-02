import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookMeetingSlotInput, PublishMeetingSlotsInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useMyMeetingSlots() {
  const api = useApiClient();
  return useQuery({ queryKey: ["meetings", "mine"], queryFn: () => api.meetings.mine() });
}

export function useAvailableMeetingSlots(teacherUserId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["meetings", "available", teacherUserId ?? null],
    queryFn: () => api.meetings.available(teacherUserId),
  });
}

export function useBookedMeetingSlots() {
  const api = useApiClient();
  return useQuery({ queryKey: ["meetings", "booked"], queryFn: () => api.meetings.booked() });
}

export function usePublishMeetingSlots() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishMeetingSlotsInput) => api.meetings.publish(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useBookMeetingSlot() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, input }: { slotId: string; input: BookMeetingSlotInput }) =>
      api.meetings.book(slotId, input),
    // Booking removes the slot from everyone else's available list too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useCancelMeetingBooking() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.meetings.cancelBooking(slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useWithdrawMeetingSlot() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.meetings.withdraw(slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
