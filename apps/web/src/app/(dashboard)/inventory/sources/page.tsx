import { SourceExplorer } from "@/components/inventory/SourceExplorer";

export default function SourcesPage() {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-[radial-gradient(circle_at_15%_20%,_#fdba74_0%,_#fed7aa_24%,_transparent_54%),radial-gradient(circle_at_82%_20%,_#f59e0b_0%,_#fbbf24_22%,_transparent_48%),linear-gradient(120deg,_#7c2d12_0%,_#c2410c_52%,_#ea580c_100%)] p-6 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/25" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">Inventory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sources</h1>
          <p className="mt-1 text-sm text-orange-100">
            Organize items by where you got them — garage sales, storage units, online, and more
          </p>
        </div>
      </div>

      <SourceExplorer currentId={null} />
    </div>
  );
}
