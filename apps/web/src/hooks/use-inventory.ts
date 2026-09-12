import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api";
import { toast } from "sonner";

export function useInventory(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["inventory", params],
    queryFn: () => inventoryApi.list(params),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => inventoryApi.get(id),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Item created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create item");
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => inventoryApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Item updated");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update item");
    },
  });
}

export function useMarkInventorySold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      soldPrice: number;
      soldVia?: string | null;
      soldNote?: string | null;
      soldAt?: string;
      delistListingIds?: string[];
    }) => inventoryApi.markSold(id, body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sources"] });

      const results = res?.delistResults as
        | Array<{ id: string; success: boolean; error?: string }>
        | undefined;
      if (results?.length) {
        const failed = results.filter((r) => !r.success);
        if (failed.length === 0) {
          toast.success(
            results.length === 1 ? "Marked as sold and delisted" : `Marked as sold and delisted from ${results.length} platforms`
          );
        } else if (failed.length === results.length) {
          toast.warning("Marked as sold, but delisting failed everywhere — delist manually from the listing.");
        } else {
          toast.warning(
            `Marked as sold. ${results.length - failed.length} platform(s) delisted, ${failed.length} failed — delist those manually.`
          );
        }
      } else {
        toast.success("Marked as sold");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to mark as sold");
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete item");
    },
  });
}
