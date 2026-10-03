"use client";

import { Check, Pencil, Zap } from "lucide-react";
import type { AccountabilityTaskView } from "@repo/types";
import { CountInput } from "./CountInput";
import { METRIC_LABELS, ProgressBar, fmtDay } from "./shared";

interface Props {
  task: AccountabilityTaskView;
  /** The day being viewed — highlighted in the week. */
  selected: string;
  today: string;
  onSet: (task: AccountabilityTaskView, progress: number, date: string) => void;
  onEdit: (task: AccountabilityTaskView) => void;
}

/** Where a weekly goal stands against an even pace through the week (null once met). */
export function paceNote(task: AccountabilityTaskView, today: string): string | null {
  const week = task.week;
  if (!week || task.completed) return null;
  const elapsed = week.days.filter((d) => d.date <= today).length;
  if (elapsed === 0) return null;
  const expected = Math.round(((task.target ?? 1) * elapsed) / 7);
  return week.total >= expected ? "On pace" : `${expected - week.total} behind pace`;
}

/**
 * A weekly goal: the week's total against its target, how that compares with an even pace, and a
 * Mon–Sun row where each day's count is typed in (or shown, for automatic goals). Days ahead of
 * today can't be filled in yet.
 */
export function WeeklyGoalRow({ task, selected, today, onSet, onEdit }: Props) {
  const week = task.week!;
  const target = task.target ?? 1;
  const auto = task.metric !== "MANUAL";
  const pace = paceNote(task, today);
  const finalWeek = task.endDate != null && task.endDate <= week.end;
  const endsNote =
    task.endDate && !finalWeek
      ? `Ends ${fmtDay(task.endDate, { month: "short", day: "numeric", year: "numeric" })}`
      : null;

  return (
    <li className="group py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-zinc-900">
          {task.title}
          {task.completed && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-emerald-700">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> Goal met
            </span>
          )}
          {finalWeek && (
            <span className="ml-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-zinc-600">
              Final week
            </span>
          )}
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

      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProgressBar value={week.total} max={target} done={task.completed} />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          {auto && <Zap className="mr-1 inline h-3 w-3 align-[-1px] text-orange-500" aria-hidden />}
          <span className="font-semibold text-zinc-800">{week.total}</span> / {target} this week
        </span>
      </div>

      <div className="mt-3 grid max-w-md grid-cols-7 gap-1.5">
        {week.days.map((d) => {
          const future = d.date > today;
          const longDay = fmtDay(d.date, { weekday: "long", month: "short", day: "numeric" });
          return (
            <div key={d.date} className="min-w-0 text-center">
              <p
                className={`mb-1 text-[11px] leading-tight ${d.date === selected ? "font-semibold text-zinc-900" : "text-zinc-400"}`}
              >
                {fmtDay(d.date, { weekday: "short" })}
                <span className="block tabular-nums">{fmtDay(d.date, { day: "numeric" })}</span>
              </p>
              {auto ? (
                <span
                  title={`${longDay}: ${future ? "not yet" : d.progress}`}
                  className={`grid h-7 place-items-center rounded-md text-xs font-semibold tabular-nums ${
                    future ? "text-zinc-300" : d.progress ? "bg-orange-50 text-zinc-900" : "bg-zinc-50 text-zinc-400"
                  }`}
                >
                  {future ? "–" : d.progress}
                </span>
              ) : (
                <CountInput
                  value={d.progress}
                  disabled={future}
                  label={`${task.title}, ${longDay}`}
                  onCommit={(v) => onSet(task, v, d.date)}
                  className={`w-full ${d.date === selected ? "border-zinc-400" : ""}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {(pace || auto || task.notes || endsNote) && (
        <p className="mt-2 text-xs text-zinc-500">
          {pace && (
            <span className={pace === "On pace" ? "font-medium text-emerald-700" : "font-medium text-orange-700"}>
              {pace}
            </span>
          )}
          {[
            auto && `Counts ${METRIC_LABELS[task.metric as keyof typeof METRIC_LABELS].toLowerCase()} on your account`,
            endsNote,
            task.notes,
          ]
            .filter(Boolean)
            .map((part, i) => (
              <span key={i}>
                {(pace || i > 0) && " — "}
                {part}
              </span>
            ))}
        </p>
      )}
    </li>
  );
}
