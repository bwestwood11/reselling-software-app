import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listingsApi } from "@/lib/api";
import { toast } from "sonner";

export function useListings(
  params?: Record<string, string>,
  refetchInterval?: number | false | ((query: any) => number | false)
) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: () => listingsApi.list(params),
    refetchInterval,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listings", id],
    queryFn: () => listingsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCrosslistListings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.crosslist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to crosslist"),
  });
}

export function usePublishListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.publish,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing published!");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to publish"),
  });
}

export function useDelistListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.delist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing ended");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkSold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, soldPrice }: { id: string; soldPrice?: number }) =>
      listingsApi.markSold(id, soldPrice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Marked as sold");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
