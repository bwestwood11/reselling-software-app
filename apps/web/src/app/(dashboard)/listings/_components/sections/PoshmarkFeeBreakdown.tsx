"use client";

/** Poshmark's commission: a flat $2.95 on sales under $15, 20% on $15 and up. */
const POSHMARK_FLAT_FEE_CENTS = 295;
const POSHMARK_FLAT_FEE_THRESHOLD_CENTS = 1500;
const POSHMARK_PERCENT_FEE = 0.2;

export function poshmarkFeeCents(priceInCents: number): number {
  return priceInCents < POSHMARK_FLAT_FEE_THRESHOLD_CENTS
    ? POSHMARK_FLAT_FEE_CENTS
    : Math.round(priceInCents * POSHMARK_PERCENT_FEE);
}

interface Props {
  price: number;
  /** Heading override — the crosslist panel names the marketplace since several can be selected. */
  title?: string;
}

export function PoshmarkFeeBreakdown({ price, title = "Fee Breakdown" }: Props) {
  const priceInCents = Math.round(price * 100);
  if (priceInCents <= 0) return null;

  const feeInCents = poshmarkFeeCents(priceInCents);
  const earningsInCents = priceInCents - feeInCents;
  const feeLabel =
    priceInCents < POSHMARK_FLAT_FEE_THRESHOLD_CENTS ? "Poshmark fee ($2.95 flat)" : "Poshmark fee (20%)";
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <section className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-400">{title}</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-zinc-700">
          <span>Listing price</span>
          <span className="font-medium">{fmt(priceInCents)}</span>
        </div>
        <div className="flex justify-between text-red-600">
          <span>{feeLabel}</span>
          <span className="font-medium">−{fmt(feeInCents)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-red-100 pt-2 font-semibold text-zinc-900">
          <span>Your earnings</span>
          <span className={earningsInCents < 0 ? "text-red-600" : "text-emerald-700"}>
            {fmt(Math.max(0, earningsInCents))}
          </span>
        </div>
        <p className="text-xs text-zinc-400">Under $15: flat $2.95 fee. $15 and up: 20%.</p>
      </div>
    </section>
  );
}
