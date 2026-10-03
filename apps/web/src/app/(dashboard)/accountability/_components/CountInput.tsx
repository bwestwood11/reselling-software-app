"use client";

import { useEffect, useState } from "react";

/**
 * A small number box for a day's count. Commits on blur or Enter, and Escape reverts. It keeps
 * its own draft, so typing "12" doesn't save "1" first.
 */
export function CountInput({
  value,
  onCommit,
  disabled,
  label,
  className = "w-12",
}: {
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = Math.floor(Number(draft));
    if (draft.trim() === "" || !Number.isFinite(n)) return setDraft(String(value));
    const clamped = Math.max(0, Math.min(10_000, n));
    if (clamped !== value) onCommit(clamped);
    else setDraft(String(value));
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={10000}
      aria-label={label}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      className={`${className} h-7 rounded-md border border-zinc-200 bg-white px-1 text-center text-xs font-semibold tabular-nums text-zinc-900 [appearance:textfield] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-zinc-50 disabled:text-zinc-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
    />
  );
}
