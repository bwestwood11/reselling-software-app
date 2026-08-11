"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Camera, Download, Loader2, Plus, RotateCcw, Star, Wand2, X, ZoomIn, ZoomOut } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { MercariBrandCombobox } from "@/components/ui/mercari-brand-combobox";
import { MercariCategoryCombobox } from "@/components/ui/mercari-category-combobox";
import { SourceSelect } from "@/components/ui/source-select";
import { Textarea } from "@/components/ui/textarea";
import { PhotoToolbar } from "@/components/inventory/PhotoToolbar";
import type { EditOptions } from "@/components/inventory/PhotoToolbar";
import type { SubscriptionInfo } from "@repo/types";
import type { CrosslistFormValues, CrosslistFormInput } from "../crosslist-form-schema";
import { SectionHeader } from "../../ui/SectionHeader";
import { Field } from "../../ui/Field";

interface ImageSlot {
  preview: string;
  url?: string;
  key?: string;
  uploading: boolean;
  error?: string;
}

interface Props {
  form: UseFormReturn<CrosslistFormInput, any, CrosslistFormValues>;
  subscription: SubscriptionInfo | undefined;
  images: (ImageSlot | undefined)[];
  editOptions: EditOptions;
  toggleEditOption: (key: keyof EditOptions) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragOverIndex: number;
  openPicker: (index: number) => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  addImageSlot: () => void;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  makePrimary: (index: number) => void;
  filledImageCount: number;
  uploadingImages: boolean;
  isGeneratingDescription: boolean;
  handleGenerateDescription: () => void;
  MAX_IMAGES: number;
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

export function NewItemFields({
  form,
  subscription,
  images,
  editOptions,
  toggleEditOption,
  fileInputRef,
  dragOverIndex,
  openPicker,
  onFilesSelected,
  removeImage,
  addImageSlot,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  makePrimary,
  filledImageCount,
  uploadingImages,
  isGeneratingDescription,
  handleGenerateDescription,
  MAX_IMAGES,
}: Props) {
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
        <SectionHeader step="—" title="New Item Details" />
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Brand">
              <MercariBrandCombobox
                value={watch("newBrand")}
                onChange={(name) => setValue("newBrand", name)}
                storeName
                variant="orange"
              />
            </Field>
            <Field label="SKU">
              <Input
                placeholder="e.g. ITEM-001"
                className="border-zinc-200 focus-visible:ring-orange-400"
                {...register("newSku")}
              />
            </Field>
          </div>

          <Field label="Source">
            <SourceSelect
              value={watch("newSourceId")}
              onChange={(id) => setValue("newSourceId", id)}
              placeholder="No source"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Condition *">
              <Select
                value={watch("newCondition")}
                onValueChange={(val) => setValue("newCondition", val as CrosslistFormValues["newCondition"])}
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
                value={watch("newCategory")}
                onChange={(path) => setValue("newCategory", path)}
                variant="orange"
              />
            </Field>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                AI description
              </Label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={filledImageCount === 0 || isGeneratingDescription}
                className="flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGeneratingDescription ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {isGeneratingDescription ? "Generating…" : "Generate into Description field"}
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Uses the uploaded photos below to write the Description field in Listing Details.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
        <SectionHeader step="—" title="Pricing & Quantity" />
        <p className="mt-1 text-xs text-zinc-400">
          The sell price below is set once in Listing Details and used for every marketplace you publish to.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Quantity *" error={errors.newQuantity?.message}>
            <Input
              type="number"
              min="1"
              className="border-zinc-200 focus-visible:ring-orange-400"
              {...register("newQuantity")}
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
                {...register("newCostPrice")}
              />
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Weight (lbs)" error={errors.newWeight?.message}>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="border-zinc-200 pr-10 focus-visible:ring-orange-400"
                {...register("newWeight")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">lbs</span>
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
        <SectionHeader step="—" title="Internal Notes" />
        <div className="mt-5">
          <Textarea
            rows={3}
            placeholder="Storage location, purchase source, or any private notes…"
            className="resize-none border-zinc-200 focus-visible:ring-orange-400"
            {...register("newNotes")}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
        <SectionHeader step="—" title="Photos" />
        <p className="mt-1 text-xs text-zinc-500">
          First photo is the primary listing image.{" "}
          {filledImageCount > 0 && (
            <span className="font-medium text-zinc-700">
              {filledImageCount} / {MAX_IMAGES} added
            </span>
          )}
        </p>

        <PhotoToolbar subscription={subscription} editOptions={editOptions} onToggle={toggleEditOption} />

        <PhotoProvider
          toolbarRender={({ scale, onScale }) => (
            <div className="flex items-center gap-1">
              <button onClick={() => onScale(scale + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                <ZoomIn className="h-5 w-5" />
              </button>
              <button onClick={() => onScale(scale - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                <ZoomOut className="h-5 w-5" />
              </button>
              <button onClick={() => onScale(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}
        >
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
                  {slot.url && !slot.uploading && !slot.error ? (
                    <PhotoView src={slot.url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slot.url} alt={`Photo ${i + 1}`} className="h-full w-full cursor-zoom-in rounded-xl object-cover" />
                    </PhotoView>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.preview} alt={`Photo ${i + 1}`} className="h-full w-full rounded-xl object-cover" />
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
                  {i > 0 && !slot.uploading && !slot.error && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); makePrimary(i); }}
                      title="Make primary"
                      className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Star className="h-3 w-3" />
                    </button>
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
                onClick={addImageSlot}
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
          Drag to reorder · click a slot to add photos · ★ to make primary.
          {uploadingImages && " Uploading…"}
        </p>
      </section>
    </>
  );
}
