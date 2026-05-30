"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft, Camera, Loader2, Plus, X, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryItem, useUpdateInventoryItem } from "@/hooks/use-inventory";

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
const MAX_IMAGES = 10;

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
  const { data, isLoading } = useInventoryItem(id);
  const updateMutation = useUpdateInventoryItem(id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);
  const [images, setImages] = useState<(string | undefined)[]>(Array(INITIAL_SLOTS).fill(undefined));

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
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
    });

    const existingImages: (string | undefined)[] = (item.images ?? [])
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((img: any) => img.url);

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

    for (const file of files) {
      while (slot < updates.length && updates[slot] !== undefined) slot++;
      if (slot >= MAX_IMAGES) break;
      if (slot >= updates.length) updates.push(undefined);
      updates[slot] = await compressImage(file);
      slot++;
    }

    setImages(updates);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
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
      images: images
        .map((url, i) =>
          url ? { url, key: url, isPrimary: i === 0, sortOrder: i } : null
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

  const busy = isSubmitting || updateMutation.isPending;
  const filledCount = images.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#f6f5f3]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/inventory/${id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Inventory
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Edit Item
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
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
                      <Input
                        placeholder="e.g. Levi's"
                        className="border-zinc-200 focus-visible:ring-orange-400"
                        {...register("brand")}
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
                      <Input
                        placeholder="e.g. Clothing › Jeans"
                        className="border-zinc-200 focus-visible:ring-orange-400"
                        {...register("category")}
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

            <div className="lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
                <SectionHeader step="04" title="Photos" />
                <p className="mt-1 text-xs text-zinc-500">
                  First photo is the primary listing image. {" "}
                  {filledCount > 0 && (
                    <span className="font-medium text-zinc-700">
                      {filledCount} / {MAX_IMAGES} added
                    </span>
                  )}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((src, i) =>
                    src ? (
                      <div key={i} className="group relative aspect-square">
                        <img
                          src={src}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full rounded-xl object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                  Click any slot to pick from your device. You can select multiple files at once.
                </p>
              </section>

              <div className="mt-4 space-y-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500 disabled:translate-y-0 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
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
