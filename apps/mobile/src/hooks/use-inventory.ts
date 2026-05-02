import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["mobile-inventory-item", id],
    queryFn: () => api.getInventoryItem(id),
    select: (d: any) => d.data,
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.createInventoryItem(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory"] });
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.updateInventoryItem(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory-item", id] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory"] });
    },
  });
}
