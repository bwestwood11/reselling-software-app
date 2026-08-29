"use client";

import { useRef } from "react";
import { cn } from "@repo/ui";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Six-box OTP entry: auto-advances on digit, backspace/arrow-key navigation,
 * and paste splits a copied code across the boxes. The boxes are a view over a
 * single string (`value`) — deleting a middle digit collapses the rest left,
 * which is the behavior people expect from bank/Apple-style code inputs.
 */
export function OtpInput({ length = 6, value, onChange, disabled, autoFocus }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[index] = digit;
    onChange(
      chars
        .join("")
        .slice(0, length),
    );
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1} of ${length}`}
          className={cn(
            "h-14 w-full min-w-0 rounded-xl border-2 border-zinc-200 bg-white text-center text-2xl font-bold tabular-nums text-zinc-900 outline-none transition-all",
            "focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "sm:h-16 sm:text-3xl",
          )}
        />
      ))}
    </div>
  );
}
