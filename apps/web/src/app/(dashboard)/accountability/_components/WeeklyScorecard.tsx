"use client";

import type { AccountabilityPerson, AccountabilityTaskView } from "@repo/types";
import { Avatar, ME_KEY, ProgressBar } from "./shared";
import { paceNote } from "./WeeklyGoalRow";

interface Props {
  tasks: AccountabilityTaskView[];
  people: AccountabilityPerson[];
  today: string;
}

/**
 * How each person is tracking against their weekly goals. The overall figure is the share of the
 * combined target reached, with each goal capped at its own target so beating one goal doesn't
 * hide a shortfall on another.
 */
export function WeeklyScorecard({ tasks, people, today }: Props) {
  const weekly = tasks.filter((t) => t.period === "WEEKLY" && t.week);
  const rows = [
    { key: ME_KEY, person: null as AccountabilityPerson | null, name: "Me" },
    ...people.map((p) => ({ key: p.id, person: p, name: p.name })),
  ]
    .map((r) => ({ ...r, goals: weekly.filter((t) => (t.personId ?? ME_KEY) === r.key) }))
    .filter((r) => r.goals.length > 0);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Weekly goals — like listing 50 items a week — show up here with each person&apos;s progress.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {rows.map((r) => {
        const reached = r.goals.reduce((s, g) => s + Math.min(g.week!.total, g.target ?? 1), 0);
        const target = r.goals.reduce((s, g) => s + (g.target ?? 1), 0);
        const share = target ? reached / target : 0;
        const met = r.goals.filter((g) => g.completed).length;
        return (
          <li key={r.key}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar person={r.person} size={24} />
                <span className="truncate text-sm font-medium text-zinc-900">{r.name}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                {Math.round(share * 100)}%
              </span>
            </div>
            <p className="mt-0.5 pl-8 text-xs text-zinc-500">
              {met} of {r.goals.length} goal{r.goals.length === 1 ? "" : "s"} met
            </p>
            <ul className="mt-2 space-y-2 pl-8">
              {r.goals.map((g) => {
                const pace = paceNote(g, today);
                return (
                  <li key={g.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate text-zinc-700">{g.title}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        <span className="font-semibold text-zinc-800">{g.week!.total}</span>/{g.target}
                      </span>
                    </div>
                    <ProgressBar value={g.week!.total} max={g.target ?? 1} done={g.completed} />
                    {pace && pace !== "On pace" && (
                      <p className="mt-0.5 text-[11px] text-orange-700">{pace}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
