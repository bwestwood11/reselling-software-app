import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.createListing(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-listings"] });
    },
  });
}

export function usePublishListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.publishListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-listings"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory"] });
    },
  });
}

export function useDelistListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delistListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-listings"] });
    },
  });
}

export function useMarkSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markListingSold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-listings"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-inventory"] });
    },
  });
}
