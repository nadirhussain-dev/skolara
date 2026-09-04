import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AllocateHostelBedInput, UpsertHostelRoomInput } from "@skolara/types";
import { useApiClient } from "../context";

export function useHostelRooms(
  filters: { blockName?: string; onlyWithFreeBeds?: boolean } = {},
) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["hostel", "rooms", filters.blockName ?? null, filters.onlyWithFreeBeds ?? false],
    queryFn: () => api.hostel.rooms(filters),
  });
}

export function useHostelRoom(id?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["hostel", "room", id],
    queryFn: () => api.hostel.roomDetail(id!),
    enabled: Boolean(id),
  });
}

export function useHostelSummary() {
  const api = useApiClient();
  return useQuery({ queryKey: ["hostel", "summary"], queryFn: () => api.hostel.summary() });
}

export function useStudentHostelAllocations(studentId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["hostel", "student", studentId],
    queryFn: () => api.hostel.forStudent(studentId!),
    enabled: Boolean(studentId),
  });
}

export function useCreateHostelRoom() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertHostelRoomInput) => api.hostel.createRoom(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel"] }),
  });
}

export function useUpdateHostelRoom() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertHostelRoomInput }) =>
      api.hostel.updateRoom(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel"] }),
  });
}

export function useRemoveHostelRoom() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.hostel.removeRoom(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel"] }),
  });
}

/**
 * Allocating changes the room's free-bed list, the block's occupancy and the
 * hostel summary, so the whole namespace is invalidated rather than guessed at.
 */
export function useAllocateHostelBed() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, input }: { roomId: string; input: AllocateHostelBedInput }) =>
      api.hostel.allocate(roomId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel"] }),
  });
}

export function useVacateHostelBed() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allocationId: string) => api.hostel.vacate(allocationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel"] }),
  });
}
