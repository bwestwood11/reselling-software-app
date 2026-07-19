"use client";

import { SectionHeader } from "../../ui/SectionHeader";

interface Props {
  itemMode: "existing" | "new";
  onChange: (mode: "existing" | "new") => void;
}

const OPTIONS = [
  { value: "existing", label: "Use existing item" },
  { value: "new", label: "Create new item" },
] as const;

export function ItemModeToggle({ itemMode, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="01" title="Item" />
      <div className="mt-5 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
              itemMode === opt.value
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
