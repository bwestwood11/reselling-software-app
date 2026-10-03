"use client";

import { CountInput } from "./CountInput";
import { Check, Minus, Pencil, Plus, Zap } from "lucide-react";
import type {
  AccountabilityMetric,
  AccountabilityPerson,
  AccountabilityTaskView,
} from "@repo/types";

// ── Dates (always the user's local calendar day, as YYYY-MM-DD) ───────────────

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(y!, m! - 1, d! + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

/** The Monday of the week containing a date (weeks run Monday–Sunday). */
export function mondayKey(key: string): string {
  return shiftKey(key, -((keyToDate(key).getDay() + 6) % 7));
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions): string {
  return keyToDate(key).toLocaleDateString("en-US", opts);
}

// ── People ────────────────────────────────────────────────────────────────────

/** Avatar colors — deep enough that white initials stay readable on every one. */
export const PERSON_COLORS = [
  "#2563eb", // blue
  "#c2410c", // rust
  "#047857", // green
  "#7c3aed", // violet
  "#be185d", // pink
  "#0e7490", // teal
  "#a16207", // ochre
  "#4b5563", // slate
];

/** The owner's own tasks are grouped under "Me". */
export const ME_KEY = "me";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function Avatar({
  person,
  size = 32,
}: {
  person: Pick<AccountabilityPerson, "name" | "color"> | null;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: person?.color ?? "linear-gradient(135deg,#f97316,#f59e0b)",
      }}
    >
      {person ? initials(person.name) : "Me"}
    </span>
  );
}

// ── Task tracking ─────────────────────────────────────────────────────────────

export const METRIC_LABELS: Record<Exclude<AccountabilityMetric, "MANUAL">, string> = {
  ITEMS_LISTED: "Items listed",
  ITEMS_ADDED: "Items added to inventory",
  ITEMS_SOLD: "Items sold",
};

export function ProgressBar({ value, max, done }: { value: number; max: number; done: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${done ? "bg-emerald-600" : "bg-orange-500"}`}
        style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }}
      />
    </div>
  );
}

interface TaskRowProps {
  task: AccountabilityTaskView;
  /** Viewing a day after today — nothing can be done on it yet. */
  future: boolean;
  onToggle: (task: AccountabilityTaskView) => void;
  /** Set a day's count (defaults to the day being viewed). */
  onSet: (task: AccountabilityTaskView, progress: number, date?: string) => void;
  onEdit: (task: AccountabilityTaskView) => void;
}

export function TaskRow({ task, future, onToggle, onSet, onEdit }: TaskRowProps) {
  const auto = task.metric !== "MANUAL";
  const counted = task.target != null;
  const checkboxLabel = task.completed ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`;

  return (
    <li className="group flex items-start gap-3 py-3">
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={auto || future}
        aria-pressed={task.completed}
        aria-label={checkboxLabel}
        title={auto ? "Completes automatically when the goal is reached" : undefined}
        className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
          task.completed
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white text-transparent hover:border-zinc-400"
        } ${auto || future ? "cursor-default" : ""} disabled:opacity-100`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-medium leading-snug ${task.completed ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900"}`}
          >
            {task.title}
          </p>
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit "${task.title}"`}
            className="-mr-1 shrink-0 rounded-md p-1 text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {counted && (
          <div className="mt-2 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <ProgressBar value={task.progress} max={task.target!} done={task.completed} />
            </div>
            {auto ? (
              <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-zinc-500">
                <Zap className="h-3 w-3 text-orange-500" aria-hidden />
                <span className="font-semibold text-zinc-800">{task.progress}</span> / {task.target}
              </span>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <StepButton label="Subtract one" onClick={() => onSet(task, task.progress - 1)} disabled={future || task.progress <= 0}>
                  <Minus className="h-3 w-3" />
                </StepButton>
                <span className="flex items-center gap-1 text-xs tabular-nums text-zinc-500">
                  <CountInput
                    value={task.progress}
                    disabled={future}
                    label={`Count for "${task.title}"`}
                    onCommit={(v) => onSet(task, v)}
                  />
                  / {task.target}
                </span>
                <StepButton label="Add one" onClick={() => onSet(task, task.progress + 1)} disabled={future}>
                  <Plus className="h-3 w-3" />
                </StepButton>
              </div>
            )}
          </div>
        )}

        {(auto || task.notes || task.endDate) && (
          <p className="mt-1 text-xs text-zinc-500">
            {[
              auto && `Counts ${METRIC_LABELS[task.metric as keyof typeof METRIC_LABELS].toLowerCase()} on your account`,
              task.endDate &&
                (task.endDate === task.onDate
                  ? null
                  : `Ends ${fmtDay(task.endDate, { month: "short", day: "numeric", year: "numeric" })}`),
              task.notes,
            ]
              .filter(Boolean)
              .join(" — ")}
          </p>
        )}
      </div>
    </li>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-6 w-6 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
