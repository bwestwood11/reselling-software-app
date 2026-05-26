import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { importApi } from "@/lib/api";
import { toast } from "sonner";

interface ImportParams {
  status?: string;
  showImported?: boolean;
  page?: number;
  limit?: number;
}

export function useImportableListings(params: ImportParams) {
  return useQuery({
    queryKey: ["ebay-importable", params],
    queryFn: () => importApi.getImportableListings(params),
    retry: 0,
  });
}

export function useImportItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ebayItemIds: string[]) => importApi.importItems(ebayItemIds),
    onSuccess: (res: any) => {
      const { imported = [], failed = [] } = res.data ?? {};
      if (imported.length > 0) {
        toast.success(`Imported ${imported.length} item${imported.length > 1 ? "s" : ""}`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} item${failed.length > 1 ? "s" : ""} failed to import`);
      }
      qc.invalidateQueries({ queryKey: ["ebay-importable"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Import failed");
    },
  });
}
