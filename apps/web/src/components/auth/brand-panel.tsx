import { ShoppingBag } from "lucide-react";

const MARKETPLACES = [
  { name: "eBay", dot: "bg-blue-400" },
  { name: "Poshmark", dot: "bg-rose-400" },
  { name: "Mercari", dot: "bg-red-400" },
  { name: "Depop", dot: "bg-violet-400" },
  { name: "Etsy", dot: "bg-teal-400" },
  { name: "Facebook Marketplace", dot: "bg-sky-400" },
] as const;

type AuthBrandPanelProps = {
  eyebrow: string;
  headline: string;
  subhead: string;
};

/**
 * Left-hand brand panel shared by the auth pages (login, verify-email) so the
 * flow reads as one continuous, trusted moment rather than disconnected screens.
 * Hidden below `lg` — the form carries a compact brand mark on smaller screens instead.
 */
export function AuthBrandPanel({ eyebrow, headline, subhead }: AuthBrandPanelProps) {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 lg:flex lg:flex-col lg:p-12 xl:p-16">
      {/* Grain texture for depth — keeps the gradient from reading flat */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="auth-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#auth-grain)" />
      </svg>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

      {/* Brand mark — pinned to the top */}
      <div className="relative flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">ReList</span>
      </div>

      {/* Copy — vertically centered in the space between the mark and the footer,
          so the panel stays balanced instead of top-heavy on tall screens */}
      <div className="relative flex flex-1 flex-col justify-center">
        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-white xl:text-[2.75rem]">
            {headline}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-orange-50/90">{subhead}</p>

          <div className="mt-8 flex flex-wrap gap-2">
            {MARKETPLACES.map(({ name, dot }, i) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm [animation:auth-float_6s_ease-in-out_infinite] motion-reduce:[animation:none]"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer line — pinned to the bottom; the "six" is literally the row above, not decoration */}
      <p className="relative text-sm font-medium text-orange-50/80">
        One photo shoot. Six marketplaces.
      </p>
    </div>
  );
}
