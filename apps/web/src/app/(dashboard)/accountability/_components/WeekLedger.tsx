"use client";

import type { AccountabilityDayStat, AccountabilityPerson } from "@repo/types";
import { Avatar, ME_KEY, fmtDay } from "./shared";

interface Props {
  week: AccountabilityDayStat[];
  people: AccountabilityPerson[];
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}

/**
 * One row per person, one cell per day. Each cell fills from the bottom with that day's share of
 * tasks done, so a streak reads as a solid run and a slipped day as a gap. Days with nothing
 * scheduled are left as an empty outline. Clicking a day opens it.
 */
export function WeekLedger({ week, people, selected, today, onSelect }: Props) {
  const rows: Array<{ key: string; person: AccountabilityPerson | null; name: string }> = [
    { key: ME_KEY, person: null, name: "Me" },
    ...people.map((p) => ({ key: p.id, person: p, name: p.name })),
  ].filter((r) => week.some((d) => d.byPerson[r.key]?.total));

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">Your last 7 days will show here once you have tasks.</p>;
  }

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-y-1.5">
        <colgroup>
          <col className="w-8" />
        </colgroup>
        <caption className="sr-only">Share of tasks done each day for the last 7 days</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Person</th>
            {week.map((d) => (
              <th key={d.date} scope="col" className="px-0.5 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => onSelect(d.date)}
                  className={`w-full rounded-md py-0.5 text-[11px] font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    d.date === selected ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  {fmtDay(d.date, { weekday: "narrow" })}
                  <span className="block tabular-nums">{fmtDay(d.date, { day: "numeric" })}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="pr-1.5 text-left font-normal" title={r.name}>
                <Avatar person={r.person} size={24} />
                <span className="sr-only">{r.name}</span>
              </th>
              {week.map((d) => {
                const s = d.byPerson[r.key];
                const share = s?.total ? s.done / s.total : 0;
                const label = s?.total
                  ? `${r.name}, ${fmtDay(d.date, { weekday: "long", month: "short", day: "numeric" })}: ${s.done} of ${s.total} done`
                  : `${r.name}, ${fmtDay(d.date, { weekday: "long", month: "short", day: "numeric" })}: nothing scheduled`;
                return (
                  <td key={d.date} className="px-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => onSelect(d.date)}
                      title={label}
                      aria-label={label}
                      className={`relative mx-auto block h-7 w-full min-w-6 max-w-8 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        s?.total ? "bg-zinc-100" : "border border-dashed border-zinc-200"
                      } ${d.date === selected ? "ring-2 ring-zinc-900 ring-offset-1" : ""}`}
                    >
                      {s?.total ? (
                        <span
                          className={`absolute inset-x-0 bottom-0 ${share === 1 ? "bg-emerald-600" : "bg-orange-400"}`}
                          style={{ height: `${share * 100}%` }}
                        />
                      ) : null}
                      {d.date === today && (
                        <span className="absolute left-1/2 top-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-zinc-900/60" />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> All done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Partly done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-zinc-300" /> Nothing due
        </span>
      </p>
    </div>
  );
}
