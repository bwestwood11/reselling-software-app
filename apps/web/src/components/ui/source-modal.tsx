"use client";

import { useState, useEffect } from "react";
import { Button, Input, Label } from "@repo/ui";
import { X } from "lucide-react";
import { SourceSelect } from "./source-select";
import { useCreateSource, useUpdateSource } from "@/hooks/use-sources";

interface SourceModalProps {
  open: boolean;
  onClose: () => void;
  defaultParentId?: string;
  editSource?: { id: string; name: string; parentId: string | null };
}

export function SourceModal({ open, onClose, defaultParentId, editSource }: SourceModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();

  useEffect(() => {
    if (open) {
      setName(editSource?.name ?? "");
      setParentId(editSource?.parentId ?? defaultParentId ?? undefined);
    }
  }, [open, editSource, defaultParentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editSource) {
      await updateSource.mutateAsync({ id: editSource.id, name: name.trim(), parentId: parentId ?? null });
    } else {
      await createSource.mutateAsync({ name: name.trim(), parentId });
    }
    onClose();
  }

  if (!open) return null;

  const isPending = createSource.isPending || updateSource.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editSource ? "Edit Source" : "New Source"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="source-name">Name</Label>
            <Input
              id="source-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Storage Unit #4"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Parent folder (optional)</Label>
            <SourceSelect
              value={parentId}
              onChange={setParentId}
              placeholder="None (top-level)"
              excludeId={editSource?.id}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-orange-600 text-white hover:bg-orange-500"
            >
              {isPending ? "Saving…" : editSource ? "Save changes" : "Create source"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
