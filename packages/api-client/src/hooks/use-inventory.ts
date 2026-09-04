import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  IssueAssetInput,
  ReturnAssetInput,
  UpsertInventoryItemInput,
} from "@skolara/types";
import { useApiClient } from "../context";

export function useInventoryItems(
  filters: { category?: string; search?: string; onlyAvailable?: boolean } = {},
) {
  const api = useApiClient();
  return useQuery({
    queryKey: [
      "inventory",
      "items",
      filters.category ?? null,
      filters.search ?? null,
      filters.onlyAvailable ?? false,
    ],
    queryFn: () => api.inventory.items(filters),
  });
}

export function useInventoryItem(id?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["inventory", "item", id],
    queryFn: () => api.inventory.itemDetail(id!),
    enabled: Boolean(id),
  });
}

export function useInventorySummary() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: () => api.inventory.summary(),
  });
}

export function useInventoryCategories() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["inventory", "categories"],
    queryFn: () => api.inventory.categories(),
  });
}

export function useOutstandingAssets() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["inventory", "outstanding"],
    queryFn: () => api.inventory.outstanding(),
  });
}

export function useCreateInventoryItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertInventoryItemInput) => api.inventory.createItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertInventoryItemInput }) =>
      api.inventory.updateItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useRemoveInventoryItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.inventory.removeItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

/** Issuing moves availability, the summary and the chase list all at once. */
export function useIssueAsset() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: IssueAssetInput }) =>
      api.inventory.issue(itemId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useReturnAsset() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input,
    }: {
      assignmentId: string;
      input: ReturnAssetInput;
    }) => api.inventory.returnAsset(assignmentId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
