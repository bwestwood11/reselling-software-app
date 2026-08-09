"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@repo/ui";
import { getMarketplaceLabel } from "@repo/utils";
import type { CrosslistResult } from "@repo/types";
import Link from "next/link";

interface Props {
  results: CrosslistResult[];
  onCreateAnother: () => void;
}

function StatusRow({ result }: { result: CrosslistResult }) {
  const label = getMarketplaceLabel(result.marketplace as any);

  if (result.status === "ACTIVE") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          <p className="text-xs text-emerald-700">Published</p>
        </div>
      </div>
    );
  }

  if (result.status === "DRAFT") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <Badge variant="secondary" className="mt-0.5">Draft</Badge>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          <p className="text-xs text-zinc-500">Draft saved — not yet published</p>
        </div>
      </div>
    );
  }

  if (result.status === "NEEDS_WEBVIEW") {
    // Both marketplaces publish out-of-band, but not the same way: Poshmark's job is already
    // queued for the Chrome extension, while Mercari still needs the mobile app to finish it.
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          <p className="text-xs text-amber-700">
            {result.marketplace === "POSHMARK"
              ? "Queued — the ReList extension is posting it now. This page updates once it lands."
              : "Draft created — finish publishing to Mercari from the ReList mobile app. Mercari can't publish from the web yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <p className="text-xs text-red-700">{result.error ?? "Failed"}</p>
      </div>
    </div>
  );
}

export function ResultsSummary({ results, onCreateAnother }: Props) {
  const failedCount = results.filter((r) => r.status === "error").length;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <div className="mb-4 flex items-center gap-2">
        {failedCount > 0 ? (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Results</h2>
      </div>

      <div className="space-y-2.5">
        {results.map((r, i) => (
          <StatusRow key={`${r.marketplace}-${i}`} result={r} />
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href="/listings"
          className="flex flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          Back to Listings
        </Link>
        <button
          type="button"
          onClick={onCreateAnother}
          className="flex flex-1 items-center justify-center rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500"
        >
          Create another
        </button>
      </div>
    </section>
  );
}
