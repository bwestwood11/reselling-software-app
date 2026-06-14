"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
} from "@repo/ui";
import { ArrowLeft, Camera, Download, Loader2, Plus, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import Link from "next/link";
import { useCreateInventoryItem } from "@/hooks/use-inventory";
import { uploadApi, subscriptionApi } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { MercariBrandCombobox } from "@/components/ui/mercari-brand-combobox";
import { MercariCategoryCombobox } from "@/components/ui/mercari-category-combobox";
import { PhotoToolbar } from "@/components/inventory/PhotoToolbar";
import type { EditOptions } from "@/components/inventory/PhotoToolbar";
import type { SubscriptionInfo } from "@repo/types";

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
});

type FormValues = z.infer<typeof schema>;

const INITIAL_SLOTS = 3;
const MAX_IMAGES = 10; // 3 initial + 7 more via "+"

interface ImageSlot {
  /** Local object URL for preview (revoked after upload) */
  preview: string;
  /** S3 public URL — undefined while uploading */
  url?: string;
  /** S3 object key — undefined while uploading */
  key?: string;
  uploading: boolean;
  error?: string;
}

export default function NewInventoryItemPage(): import("react").JSX.Element {
  const router = useRouter();
  const createMutation = useCreateInventoryItem();

  const { data: subData } = useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 60_000,
  });
  const subscription = subData?.data;

  const [images, setImages] = useState<(ImageSlot | undefined)[]>(
    Array(INITIAL_SLOTS).fill(undefined)
  );
  const [editOptions, setEditOptions] = useState<EditOptions>({
    removeBackground: false,
    flatLay: false,
    ironing: false,
    ghostMannequin: false,
  });

  function toggleEditOption(key: keyof EditOptions) {
    setEditOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { condition: "GOOD", quantity: 1 },
  });

  function openPicker(slotIndex: number) {
    pendingSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Find starting slot and allocate placeholders immediately so the UI shows previews
    let slot = pendingSlotRef.current;
    const updates = [...images];

    const toUpload: Array<{ file: File; slotIndex: number }> = [];

    for (const file of files) {
      while (slot < updates.length && updates[slot] !== undefined) slot++;
      if (slot >= MAX_IMAGES) break;
      if (slot >= updates.length) updates.push(undefined);

      const preview = URL.createObjectURL(file);
      updates[slot] = { preview, uploading: true };
      toUpload.push({ file, slotIndex: slot });
      slot++;
    }

    setImages([...updates]);
    e.target.value = "";

    // Upload each file and update the slot when done
    await Promise.all(
      toUpload.map(async ({ file, slotIndex }) => {
        try {
          const { url, key } = await uploadApi.uploadImage(file, editOptions);
          setImages((prev) => {
            const next = [...prev];
            const existing = next[slotIndex];
            if (existing) {
              URL.revokeObjectURL(existing.preview);
              next[slotIndex] = { preview: url, url, key, uploading: false };
            }
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
      if (slot) URL.revokeObjectURL(slot.preview);
      next[index] = undefined;
      // trim trailing empty slots down to INITIAL_SLOTS minimum
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

  const uploading = images.some((s) => s?.uploading);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      costPrice: values.costPrice === "" ? undefined : values.costPrice,
      targetPrice: values.targetPrice === "" ? undefined : values.targetPrice,
      weight: values.weight === "" ? undefined : values.weight,
      images: images
        .map((slot, i) =>
          slot?.url && slot.key
            ? { url: slot.url, key: slot.key, isPrimary: i === 0, sortOrder: i }
            : null
        )
        .filter(Boolean) as { url: string; key: string; isPrimary: boolean; sortOrder: number }[],
    };
    await createMutation.mutateAsync(payload);
    router.push("/inventory");
  }

  const busy = isSubmitting || createMutation.isPending || uploading;
  const filledCount = images.filter((s) => s?.url).length;

  return (
    <div className="min-h-screen bg-[#f6f5f3]">
      {/* Hidden file input — allows multiple files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/inventory"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Inventory
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Add New Item
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* ── Left — form fields ───────────────────────────────── */}
            <div className="space-y-5">

              {/* Item Details */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="01" title="Item Details" />
                <div className="mt-5 space-y-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Condition *">
                      <Select
                        defaultValue="GOOD"
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
              </section>

              {/* Pricing & Quantity */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="02" title="Pricing & Quantity" />
                <div className="mt-5 grid grid-cols-3 gap-4">
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
              </section>

              {/* Notes */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="03" title="Internal Notes" />
                <div className="mt-5">
                  <Textarea
                    rows={3}
                    placeholder="Storage location, purchase source, or any private notes…"
                    className="resize-none border-zinc-200 focus-visible:ring-orange-400"
                    {...register("notes")}
                  />
                </div>
              </section>
            </div>

            {/* ── Right — images + save ────────────────────────────── */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="04" title="Photos" />
                <p className="mt-1 text-xs text-zinc-500">
                  First photo is the primary listing image.{" "}
                  {filledCount > 0 && (
                    <span className="font-medium text-zinc-700">
                      {filledCount} / {MAX_IMAGES} added
                    </span>
                  )}
                </p>

                <PhotoToolbar
                  subscription={subscription}
                  editOptions={editOptions}
                  onToggle={toggleEditOption}
                />

                {/* Image grid */}
                <PhotoProvider
                  toolbarRender={({ scale, onScale }) => (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onScale(scale + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onScale(scale - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onScale(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                >
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((slot, i) =>
                    slot ? (
                      /* Filled slot */
                      <div key={i} className="group relative aspect-square">
                        {slot.url && !slot.uploading && !slot.error ? (
                          <PhotoView src={slot.url}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slot.url}
                              alt={`Photo ${i + 1}`}
                              className="h-full w-full cursor-zoom-in rounded-xl object-cover"
                            />
                          </PhotoView>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={slot.preview}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        )}
                        {slot.url && !slot.uploading && !slot.error && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover:bg-black/10">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" />
                          </div>
                        )}
                        {slot.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
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
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {slot.url && !slot.uploading && !slot.error && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void downloadImage(slot.url!, i); }}
                            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Empty slot */
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

                  {/* "+" add slot button */}
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
                </PhotoProvider>

                <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                  Click any slot to pick from your device. You can select multiple files at once.
                </p>
              </section>

              {/* Action buttons */}
              <div className="mt-4 space-y-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploading ? "Uploading photos…" : "Save item"}
                </button>
                <Link
                  href="/inventory"
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-[10px] font-bold text-white">
        {step}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
    </div>
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
