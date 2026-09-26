"use client";

import { use, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from "@repo/ui";
import { ArrowLeft, Camera, Download, Loader2, Plus, Star, X, Package } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryItem, useUpdateInventoryItem } from "@/hooks/use-inventory";
import { uploadApi, subscriptionApi } from "@/lib/api";
import { MercariBrandCombobox } from "@/components/ui/mercari-brand-combobox";
import { MercariCategoryCombobox } from "@/components/ui/mercari-category-combobox";
import { SourceSelect } from "@/components/ui/source-select";
import { PhotoToolbar, PhotoAIMenu } from "@/components/inventory/PhotoToolbar";
import type { EditOptions } from "@/components/inventory/PhotoToolbar";
import type { SubscriptionInfo } from "@repo/types";
import { cn } from "@/lib/utils";

// Same ledger language as the item page (/inventory/[id]) — cream page background, a plain
// back-link + inked status stamp up top, and dot-and-hairline section headers instead of
// boxed cards, so editing an item still feels like the same tag you were just looking at.
const LINE = "#e4e4e7"; // zinc-200 — the punch-hole ring Tailwind classes can't express

const STAMP_CLASSES: Record<string, string> = {
  DRAFT: "text-zinc-500 border-zinc-400",
  ACTIVE: "text-orange-600 border-orange-600",
  SOLD: "text-zinc-900 border-zinc-900",
  ARCHIVED: "text-zinc-400 border-zinc-300",
};

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  condition: z.enum([
    "NEW_WITH_TAGS",
    "NEW_WITHOUT_TAGS",
    "VERY_GOOD",
    "GOOD",
    "SATISFACTORY",
  ]),
  quantity: z.coerce.number().int().min(1),
  costPrice: z.coerce.number().positive().optional().or(z.literal("")),
  targetPrice: z.coerce.number().positive().optional().or(z.literal("")),
  weight: z.coerce.number().positive().optional().or(z.literal("")),
  category: z.string().optional(),
  notes: z.string().optional(),
  sourceId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
// Zod v4 gives z.coerce fields an `unknown` input type (pre-coercion) distinct from their
// output type — RHF needs the raw input shape for useForm's TFieldValues generic.
type FormInput = z.input<typeof schema>;

const INITIAL_SLOTS = 3;
const MAX_IMAGES = 10;

interface ImageSlot {
  /** Display src: object URL (temporary), base64 data URL, or S3 URL */
  src: string;
  /** Set once the image is uploaded to S3 */
  s3Url?: string;
  uploading: boolean;
  error?: string;
  /** True while an AI photo tool is being applied to this already-uploaded image. */
  processing?: boolean;
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height / width) * MAX);
            width = MAX;
          } else {
            width = Math.round((width / height) * MAX);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): import("react").JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useInventoryItem(id);
  const updateMutation = useUpdateInventoryItem(id);

  const { data: subData } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 60_000,
  });
  const subscription = subData?.data;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);
  const draggedIndexRef = useRef<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);
  const [images, setImages] = useState<(ImageSlot | undefined)[]>(Array(INITIAL_SLOTS).fill(undefined));
  const [editOptions, setEditOptions] = useState<EditOptions>({
    removeBackground: false,
    flatLay: false,
    ironing: false,
    ghostMannequin: false,
  });

  function toggleEditOption(key: keyof EditOptions) {
    setEditOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = draggedIndexRef.current;
    if (from === -1 || from === index) { setDragOverIndex(-1); return; }
    setImages((prev) => {
      const next = [...prev];
      [next[from], next[index]] = [next[index], next[from]];
      return next;
    });
    setDragOverIndex(-1);
    draggedIndexRef.current = -1;
  }

  function handleDragEnd() {
    setDragOverIndex(-1);
    draggedIndexRef.current = -1;
  }

  function makePrimary(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, any, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { condition: "GOOD", quantity: 1 },
  });

  const item = data?.data;

  useEffect(() => {
    if (!item) return;

    reset({
      title: item.title ?? "",
      description: item.description ?? "",
      brand: item.brand ?? "",
      sku: item.sku ?? "",
      condition: item.condition ?? "GOOD",
      quantity: item.quantity ?? 1,
      costPrice: item.costPrice ? Number(item.costPrice) : "",
      targetPrice: item.targetPrice ? Number(item.targetPrice) : "",
      weight: item.weight ? Number(item.weight) : "",
      category: item.category ?? "",
      notes: item.notes ?? "",
      sourceId: item.source?.id ?? undefined,
    });

    const existingImages: (ImageSlot | undefined)[] = (item.images ?? [])
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((img: any) => ({ src: img.url, s3Url: img.url, uploading: false }));

    const padded = [...existingImages];
    while (padded.length < INITIAL_SLOTS) padded.push(undefined);
    setImages(padded.slice(0, MAX_IMAGES));
  }, [item, reset]);

  function openPicker(slotIndex: number) {
    pendingSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const updates = [...images];
    let slot = pendingSlotRef.current;

    const usePhotoroom = editOptions.removeBackground || editOptions.flatLay || editOptions.ironing || editOptions.ghostMannequin;

    if (usePhotoroom) {
      // Upload to S3 via PhotoRoom v2 — show preview immediately, update when done
      const toUpload: Array<{ file: File; slotIndex: number }> = [];

      for (const file of files) {
        while (slot < updates.length && updates[slot] !== undefined) slot++;
        if (slot >= MAX_IMAGES) break;
        if (slot >= updates.length) updates.push(undefined);

        const preview = URL.createObjectURL(file);
        updates[slot] = { src: preview, uploading: true };
        toUpload.push({ file, slotIndex: slot });
        slot++;
      }

      setImages([...updates]);
      e.target.value = "";

      await Promise.all(
        toUpload.map(async ({ file, slotIndex }) => {
          try {
            const { url } = await uploadApi.uploadImage(file, editOptions);
            setImages((prev) => {
              const next = [...prev];
              const existing = next[slotIndex];
              if (existing?.src.startsWith("blob:")) URL.revokeObjectURL(existing.src);
              next[slotIndex] = { src: url, s3Url: url, uploading: false };
              return next;
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            setImages((prev) => {
              const next = [...prev];
              const existing = next[slotIndex];
              if (existing) next[slotIndex] = { ...existing, uploading: false, error: message };
              return next;
            });
          }
        })
      );
    } else {
      // Compress client-side to base64 (existing behavior)
      for (const file of files) {
        while (slot < updates.length && updates[slot] !== undefined) slot++;
        if (slot >= MAX_IMAGES) break;
        if (slot >= updates.length) updates.push(undefined);
        const base64 = await compressImage(file);
        updates[slot] = { src: base64, uploading: false };
        slot++;
      }

      setImages(updates);
      e.target.value = "";
    }
  }

  /** Runs a single AI photo tool on an already-uploaded image, replacing it in place. */
  async function applyAiToolToImage(index: number, key: keyof EditOptions) {
    const slot = images[index];
    const sourceUrl = slot?.s3Url;
    if (!slot || !sourceUrl || slot.uploading || slot.processing) return;

    setImages((prev) => {
      const next = [...prev];
      const existing = next[index];
      if (existing) next[index] = { ...existing, processing: true, error: undefined };
      return next;
    });

    try {
      const { url } = await uploadApi.reprocessImage(sourceUrl, { [key]: true });
      setImages((prev) => {
        const next = [...prev];
        next[index] = { src: url, s3Url: url, uploading: false, processing: false };
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Photo updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI edit failed";
      setImages((prev) => {
        const next = [...prev];
        const existing = next[index];
        if (existing) next[index] = { ...existing, processing: false };
        return next;
      });
      toast.error(message);
    }
  }

  async function downloadImage(url: string, index: number) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `photo-${index + 1}.${blob.type.split("/")[1] ?? "png"}`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silent — user can still right-click save
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const slot = next[index];
      if (slot?.src.startsWith("blob:")) URL.revokeObjectURL(slot.src);
      next[index] = undefined;
      while (next.length > INITIAL_SLOTS && next[next.length - 1] === undefined) {
        next.pop();
      }
      return next;
    });
  }

  function addSlot() {
    if (images.length >= MAX_IMAGES) return;
    setImages((prev) => [...prev, undefined]);
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      costPrice: values.costPrice === "" ? undefined : values.costPrice,
      targetPrice: values.targetPrice === "" ? undefined : values.targetPrice,
      weight: values.weight === "" ? undefined : values.weight,
      sourceId: values.sourceId ?? null,
      images: images
        .map((slot, i) =>
          slot && !slot.uploading
            ? {
                url: slot.s3Url ?? slot.src,
                key: slot.s3Url ?? slot.src,
                isPrimary: i === 0,
                sortOrder: i,
              }
            : null
        )
        .filter(Boolean) as { url: string; key: string; isPrimary: boolean; sortOrder: number }[],
    };

    await updateMutation.mutateAsync(payload);
    router.push(`/inventory/${id}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-56 rounded bg-zinc-200" />
        <div className="h-96 rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="mb-4 h-12 w-12 text-zinc-300" />
        <p className="text-zinc-600">Item not found</p>
        <Button className="mt-4" asChild>
          <Link href="/inventory">Back to inventory</Link>
        </Button>
      </div>
    );
  }

  const uploading = images.some((s) => s?.uploading);
  const processingPhoto = images.some((s) => s?.processing);
  const busy = isSubmitting || updateMutation.isPending || uploading || processingPhoto;
  const filledCount = images.filter((s) => s && !s.uploading).length;
  const stampClasses = STAMP_CLASSES[item.status as keyof typeof STAMP_CLASSES] ?? STAMP_CLASSES.DRAFT;

  return (
    <div className="mx-auto max-w-5xl bg-[#f6f5f3] pb-16 text-zinc-900">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      {/* Top bar: back link + inked status stamp — mirrors the item page */}
      <div className="flex items-center justify-between">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inventory
        </Link>
        <span
          className={cn(
            "select-none rounded-[3px] border-2 px-3 py-1 font-mono text-[13px] font-bold uppercase tracking-[0.12em]",
            stampClasses
          )}
          style={{ transform: "rotate(-3deg)", mixBlendMode: "multiply" }}
        >
          {item.status}
        </span>
      </div>

      {/* Heading */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Editing</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
          {item.title}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12.5px] text-zinc-500">
          {item.brand && <span>{item.brand}</span>}
          {item.sku && <span>SKU {item.sku}</span>}
        </div>
      </div>

      {/* Perforation — where a real tag would tear from the ledger below */}
      <div
        className="relative my-9 h-px"
        style={{ background: `repeating-linear-gradient(to right, ${LINE} 0 6px, transparent 6px 14px)` }}
      >
        <span className="absolute -left-1.5 -top-2 h-4 w-4 rounded-full border-2 border-zinc-300 bg-[#f6f5f3]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <Section title="Item Details">
              <div className="space-y-4">
                <Field label="Title *" error={errors.title?.message}>
                  <Input
                    placeholder="e.g. Vintage Levi 501 Jeans Size 32x30"
                    className="border-zinc-200 focus-visible:ring-orange-400"
                    {...register("title")}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Brand">
                    <MercariBrandCombobox
                      value={watch("brand")}
                      onChange={(name) => setValue("brand", name)}
                      storeName
                      variant="orange"
                    />
                  </Field>
                  <Field label="SKU">
                    <Input
                      placeholder="e.g. ITEM-001"
                      className="border-zinc-200 focus-visible:ring-orange-400"
                      {...register("sku")}
                    />
                  </Field>
                </div>

                <Field label="Source">
                  <SourceSelect
                    value={watch("sourceId") || undefined}
                    onChange={(id) => setValue("sourceId", id)}
                    placeholder="No source"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Condition *">
                    <Select
                      defaultValue={item.condition ?? "GOOD"}
                      onValueChange={(val) => setValue("condition", val as any)}
                    >
                      <SelectTrigger className="border-zinc-200 focus:ring-orange-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW_WITH_TAGS">New with tags</SelectItem>
                        <SelectItem value="NEW_WITHOUT_TAGS">New without tags</SelectItem>
                        <SelectItem value="VERY_GOOD">Very good</SelectItem>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Category">
                    <MercariCategoryCombobox
                      value={watch("category")}
                      onChange={(path) => setValue("category", path)}
                      variant="orange"
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <Textarea
                    rows={4}
                    placeholder="Describe condition, measurements, notable details…"
                    className="resize-none border-zinc-200 focus-visible:ring-orange-400"
                    {...register("description")}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Pricing & Quantity">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Quantity *" error={errors.quantity?.message}>
                  <Input
                    type="number"
                    min="1"
                    className="border-zinc-200 focus-visible:ring-orange-400"
                    {...register("quantity")}
                  />
                </Field>
                <Field label="Cost price">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="border-zinc-200 pl-7 focus-visible:ring-orange-400"
                      {...register("costPrice")}
                    />
                  </div>
                </Field>
                <Field label="List price">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="border-zinc-200 pl-7 focus-visible:ring-orange-400"
                      {...register("targetPrice")}
                    />
                  </div>
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <Field label="Weight (lbs)" error={errors.weight?.message}>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="border-zinc-200 pr-10 focus-visible:ring-orange-400"
                      {...register("weight")}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">lbs</span>
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Internal Notes">
              <Textarea
                rows={3}
                placeholder="Storage location, purchase source, or any private notes…"
                className="resize-none border-zinc-200 focus-visible:ring-orange-400"
                {...register("notes")}
              />
            </Section>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Section
              card
              title="Photos"
              action={
                filledCount > 0 ? (
                  <span className="font-mono text-[11px] text-zinc-500">
                    {filledCount} / {MAX_IMAGES}
                  </span>
                ) : undefined
              }
            >
              <p className="mb-4 text-xs text-zinc-500">First photo is the primary listing image.</p>

              <PhotoToolbar subscription={subscription} editOptions={editOptions} onToggle={toggleEditOption} />

              <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((slot, i) =>
                    slot ? (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={(e) => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        className={`group relative aspect-square cursor-grab active:cursor-grabbing ${
                          dragOverIndex === i ? "rounded-xl ring-2 ring-orange-500 ring-offset-1" : ""
                        }`}
                      >
                        <img
                          src={slot.src}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full rounded-xl object-cover"
                        />
                        {slot.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                        {slot.processing && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-black/50">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                            <span className="text-[10px] font-medium text-white">Applying AI edit…</span>
                          </div>
                        )}
                        {slot.error && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-900/60 p-1">
                            <span className="text-center text-[10px] leading-tight text-white">{slot.error}</span>
                          </div>
                        )}
                        {i === 0 && !slot.uploading && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            Primary
                          </span>
                        )}
                        {i > 0 && !slot.uploading && !slot.error && (
                          <button
                            type="button"
                            onClick={() => makePrimary(i)}
                            title="Make primary"
                            className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {slot.s3Url && !slot.uploading && !slot.error && (
                          <span className="absolute left-1.5 top-1.5">
                            <PhotoAIMenu
                              subscription={subscription}
                              applying={!!slot.processing}
                              onSelect={(key) => void applyAiToolToImage(i, key)}
                            />
                          </span>
                        )}
                        {!slot.uploading && !slot.error && !slot.src.startsWith("blob:") && (
                          <button
                            type="button"
                            onClick={() => void downloadImage(slot.s3Url ?? slot.src, i)}
                            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openPicker(i)}
                        className="group aspect-square rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-all hover:border-orange-300 hover:bg-orange-50"
                      >
                        <div className="flex h-full flex-col items-center justify-center gap-1">
                          <Camera className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-orange-400" />
                          {i === 0 && (
                            <span className="text-[10px] font-medium text-zinc-400 group-hover:text-orange-500">
                              Add photo
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  )}

                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={addSlot}
                      className="group aspect-square rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-all hover:border-orange-300 hover:bg-orange-50"
                    >
                      <div className="flex h-full items-center justify-center">
                        <Plus className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-orange-400" />
                      </div>
                    </button>
                  )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                Drag to reorder · click a slot to add photos · ★ to make primary · hover a photo and tap
                the wand to edit it with AI.
              </p>
            </Section>

            <div className="mt-4 space-y-2">
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading || processingPhoto ? "Processing photos…" : "Save changes"}
              </button>
              <Link
                href={`/inventory/${id}`}
                className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Ledger block matching the item page's Section: a dot-marked label over a hairline, then
 *  content below. `card` wraps it in the same bordered/shadow-sm frame as the photo panel;
 *  without it, the section sits flat on the page like the item page's own detail blocks. */
function Section({
  title,
  action,
  card,
  children,
}: {
  title: string;
  action?: ReactNode;
  card?: boolean;
  children: ReactNode;
}) {
  const header = (
    <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        {title}
      </h2>
      {action}
    </div>
  );

  if (card) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {header}
        {children}
      </section>
    );
  }

  return (
    <section className="pt-8 first:pt-0">
      {header}
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
