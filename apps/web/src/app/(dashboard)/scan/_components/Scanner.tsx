"use client";
/* eslint-disable @next/next/no-img-element -- blob: URLs; next/image can't optimize these */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  FileJson,
  ImagePlus,
  Layers,
  Loader2,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ScanAnalysis, ScanEbayResult, ScanTier } from "@repo/types";
import { cn } from "@repo/ui";
import { scanApi } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { annotate } from "@/lib/scanner/annotate";
import { buildViews, encodeJobs, loadImage, type Job } from "@/lib/scanner/enhance";
import { ebayQuery, runScan } from "./run-scan";
import { ProductCard, usd } from "./ProductCard";

type TierOption = {
  id: ScanTier;
  name: string;
  description: string;
  Icon: LucideIcon;
  /** Zoomed tiles per side (0 = whole photo only). Internal: never shown to the user. */
  grid: number;
  /** Shown until /api/scan/config loads; the server's prices are the source of truth. */
  fallbackCredits: number;
  recommended?: boolean;
};

const TIERS: TierOption[] = [
  {
    id: "quick",
    name: "Quick scan",
    description: "A fast look at the whole photo. Best for a few large items.",
    Icon: Zap,
    grid: 0,
    fallbackCredits: 5,
  },
  {
    id: "detailed",
    name: "Detailed scan",
    description: "A closer look that catches smaller items. Best for most photos.",
    Icon: ScanSearch,
    grid: 2,
    fallbackCredits: 10,
    recommended: true,
  },
  {
    id: "deep",
    name: "Deep scan",
    description: "Our most thorough scan. Best for packed shelves and bins.",
    Icon: Layers,
    grid: 3,
    fallbackCredits: 15,
  },
];

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function Scanner() {
  const queryClient = useQueryClient();
  const { data: subData } = useSubscription();
  const { data: configData } = useQuery({
    queryKey: ["scan-config"],
    queryFn: () => scanApi.getConfig(),
    staleTime: 10 * 60 * 1000,
  });
  const creditsFor = (t: TierOption) => configData?.data?.credits?.[t.id] ?? t.fallbackCredits;

  const [tier, setTier] = useState<ScanTier>("detailed");
  const selected = TIERS.find((t) => t.id === tier)!;
  const scanCost = creditsFor(selected);
  const subscription = subData?.data;
  const credits = subscription ? subscription.aiCredits + subscription.bonusAiCredits : null;
  const notEnoughCredits = credits != null && credits < scanCost;

  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [fileName, setFileName] = useState("photo");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanAnalysis | null>(null);
  const [ebay, setEbay] = useState<ScanEbayResult[] | null>(null);
  const [labeledUrl, setLabeledUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const prepareRun = useRef(0); // only the latest prepare() may update state
  const fileInput = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (labeledUrl) URL.revokeObjectURL(labeledUrl);
    },
    [labeledUrl]
  );

  // preview the photo as prepared for the scan
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    const blob = jobs[0]?.views[0]?.blob;
    if (!blob) return setPreview(null);
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [jobs]);

  function clearResults() {
    setResult(null);
    setEbay(null);
    setLabeledUrl(null);
    setError("");
    setPartial(false);
  }

  /** Prepare the photo for the chosen tier; called when the photo or the tier changes. */
  async function prepare(bm: ImageBitmap, grid: number) {
    const run = ++prepareRun.current;
    setPreparing(true);
    // yield a frame so the spinner paints before the pixel work blocks the thread
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (run !== prepareRun.current) return;
    try {
      const encoded = await encodeJobs(buildViews(bm, true, grid));
      if (run === prepareRun.current) {
        setJobs(encoded);
        setError("");
      }
    } catch {
      if (run === prepareRun.current) {
        setJobs([]);
        setError("This photo is too large to scan. Try a smaller photo.");
      }
    } finally {
      if (run === prepareRun.current) setPreparing(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    let bm: ImageBitmap;
    try {
      bm = await loadImage(file);
    } catch {
      setError("This browser can't read that image format (try JPEG or PNG)");
      return;
    }
    setBitmap(bm);
    setFileName(file.name.replace(/\.[^.]+$/, "") || "photo");
    clearResults();
    prepare(bm, selected.grid);
  }

  function chooseTier(t: TierOption) {
    setTier(t.id);
    if (bitmap) prepare(bitmap, t.grid);
  }

  function reset() {
    prepareRun.current++;
    setBitmap(null);
    setJobs([]);
    setPreparing(false);
    clearResults();
    if (fileInput.current) fileInput.current.value = "";
  }

  function scanAnother() {
    reset();
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    fileInput.current?.click();
  }

  function downloadJson() {
    if (!result) return;
    const data = {
      ...result,
      products: result.products.map((p, i) => ({ ...p, ebay: ebay?.[i] ?? null })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    );
    const a = Object.assign(document.createElement("a"), { href: url, download: `${fileName}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function analyze() {
    if (!bitmap || !jobs.length) return;
    setBusy(true);
    clearResults();
    try {
      const { analysis, partial } = await runScan(tier, jobs, setStatus);
      setResult(analysis);
      setPartial(partial);
      annotate(bitmap, analysis).toBlob(
        (blob) => blob && setLabeledUrl(URL.createObjectURL(blob)),
        "image/jpeg",
        0.9
      );

      if (analysis.products.length) {
        setStatus("Checking eBay prices…");
        try {
          setEbay((await scanApi.ebay(analysis.products.map(ebayQuery))).data);
        } catch {
          setEbay([]); // cards fall back to showing nothing from eBay
        }
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setStatus("");
      setBusy(false);
      // the scan spent credits: refresh the balance in the sidebar
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    }
  }

  const minCredits = Math.min(...TIERS.map(creditsFor));

  return (
    <div ref={top} className="scroll-mt-8 space-y-7">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_15%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_54%),radial-gradient(circle_at_82%_20%,_#f59e0b_0%,_#fbbf24_22%,_transparent_48%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/25" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
              AI Scanner
            </p>
            <h1 className="mt-1 flex items-baseline gap-2.5 text-3xl font-semibold tracking-tight">
              Scan a Photo
              {/* status marker in the header gradient's own deep rust, sat on the heading's baseline */}
              <span className="relative -top-1 rounded-md bg-[#7c2d12]/85 px-1.5 py-0.5 text-xs font-medium tracking-normal text-orange-50">
                Beta
              </span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-orange-50">
              Upload a photo of a storage unit, garage or shelf. AI finds the resellable items, reads
              model numbers, estimates prices and checks them against eBay.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium">
            <Zap className="h-3.5 w-3.5" />
            From {minCredits} credits per photo
          </span>
        </div>
      </div>

      {/* Upload + scan type */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label
            className={cn(
              "relative flex min-h-[320px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
              dragOver
                ? "border-orange-400 bg-orange-50/60"
                : preview
                  ? "border-zinc-200 bg-zinc-50"
                  : "border-zinc-300 bg-[#fbfaf8] hover:border-orange-300 hover:bg-orange-50/40"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFile(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Photo to scan"
                className="max-h-[460px] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="px-6 py-10">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_10px_20px_-12px_rgba(249,115,22,0.7)]">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-800">
                  Click or drop a photo here
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  JPEG, PNG or WebP · one photo per scan
                </p>
              </div>
            )}
            {(preparing || busy) && preview && (
              <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-[2px]">
                <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  {busy ? status || "Scanning…" : "Getting your photo ready…"}
                </p>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {bitmap && (
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span className="truncate">{fileName}</span>
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex items-center gap-1 font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Remove photo
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">Scan type</p>

          <div className="space-y-2.5" role="radiogroup" aria-label="Scan type">
            {TIERS.map((t) => {
              const active = t.id === tier;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy}
                  onClick={() => chooseTier(t)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-orange-400 bg-orange-50/70 ring-1 ring-orange-400"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      active
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-500"
                    )}
                  >
                    <t.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{t.name}</span>
                      {t.recommended && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                      {t.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-zinc-900">
                      {creditsFor(t)}
                    </span>
                    <span className="block text-[10px] text-zinc-400">credits</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-2 pt-1">
            <button
              type="button"
              onClick={analyze}
              disabled={busy || preparing || !jobs.length || notEnoughCredits}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-semibold text-white shadow-[0_14px_24px_-12px_rgba(249,115,22,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {busy ? "Scanning…" : `Start ${selected.name.toLowerCase()} · ${scanCost} credits`}
            </button>
            {notEnoughCredits ? (
              <p className="text-center text-xs text-red-500">
                You have {credits} credits left —{" "}
                <Link href="/settings/billing" className="font-medium underline">
                  buy a top-up
                </Link>
              </p>
            ) : credits != null ? (
              <p className="text-center text-[11px] text-zinc-400">
                {credits.toLocaleString()} credits available
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Items found
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                    {result.products.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Estimated total value
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                    {usd(result.total_estimated_low_usd)} – {usd(result.total_estimated_high_usd)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {labeledUrl && (
                  <a
                    href={labeledUrl}
                    download={`${fileName}_labeled.jpg`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-200 hover:bg-orange-50/50 hover:text-orange-700"
                  >
                    <Download className="h-4 w-4" />
                    Labeled image
                  </a>
                )}
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-200 hover:bg-orange-50/50 hover:text-orange-700"
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={scanAnother}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-semibold text-white shadow-[0_14px_24px_-12px_rgba(249,115,22,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" />
                  Scan another photo
                </button>
              </div>
            </div>
            {result.scene_description && (
              <p className="mt-4 flex gap-2 text-sm leading-relaxed text-zinc-600">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                {result.scene_description}
              </p>
            )}
            {partial && (
              <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Part of the photo couldn&apos;t be analyzed, so some items may be missing. Scan
                again for complete results.
              </p>
            )}
          </div>

          {labeledUrl && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
              <img
                src={labeledUrl}
                alt="Photo with the found items boxed and numbered"
                className="w-full rounded-xl"
              />
            </div>
          )}

          {result.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
              <ScanSearch className="mb-4 h-12 w-12 text-zinc-300" />
              <h3 className="text-lg font-medium text-zinc-900">No resellable items found</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Try a closer or brighter photo, or a Deep scan for packed shelves.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.products.map((p, i) => (
                <ProductCard
                  key={i}
                  index={i}
                  product={p}
                  ebay={ebay?.[i]}
                  ebayPending={busy && !ebay}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
