import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "@/lib/api";
import { toast } from "sonner";

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: () => sourcesApi.list(),
    select: (res: any) => res.data as Array<{ id: string; name: string; parentId: string | null; createdAt: string }>,
  });
}

export function useSourceStats() {
  return useQuery({
    queryKey: ["sources", "stats"],
    queryFn: () => sourcesApi.getStats(),
    select: (res: any) => res.data,
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sourcesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source created");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create source"),
  });
}

export function useUpdateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; parentId?: string | null }) =>
      sourcesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update source"),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sourcesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Source deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete source"),
  });
}
