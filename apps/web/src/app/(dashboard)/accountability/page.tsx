"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import type {
  AccountabilityDay,
  AccountabilityPerson,
  AccountabilityTaskInput,
  AccountabilityTaskView,
} from "@repo/types";
import { accountabilityApi } from "@/lib/api";
import { Avatar, ME_KEY, TaskRow, fmtDay, shiftKey, todayKey } from "./_components/shared";
import { TaskDialog, draftFromTask, type TaskDraft } from "./_components/TaskDialog";
import { PeopleDialog } from "./_components/PeopleDialog";
import { WeekLedger } from "./_components/WeekLedger";
import { WeeklyGoalRow } from "./_components/WeeklyGoalRow";
import { WeeklyScorecard } from "./_components/WeeklyScorecard";

/** One-tap starting points for an empty board. */
const STARTERS: Array<{ label: string; draft: TaskDraft }> = [
  { label: "List 10 items", draft: { title: "List 10 items", metric: "ITEMS_LISTED", target: 10 } },
  { label: "Add 5 items to inventory", draft: { title: "Add 5 items to inventory", metric: "ITEMS_ADDED", target: 5 } },
  { label: "Photograph 20 items", draft: { title: "Photograph 20 items", target: 20 } },
  { label: "Ship today's orders", draft: { title: "Ship today's orders", schedule: "WEEKDAYS" } },
  { label: "List 50 items this week", draft: { title: "List 50 items this week", period: "WEEKLY", target: 50 } },
];

export default function AccountabilityPage(): import("react").JSX.Element {
  const qc = useQueryClient();
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);

  const queryKey = ["accountability", date];
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: () => accountabilityApi.getDay(date),
    placeholderData: keepPreviousData,
    // Auto-tracked tasks count live activity — keep today's numbers fresh while the page is open.
    refetchInterval: date === today ? 60_000 : false,
  });
  const day: AccountabilityDay | undefined = data?.data;
  const people = day?.people ?? [];
  const tasks = day?.tasks ?? [];
  const future = date > today;

  const refresh = () => qc.invalidateQueries({ queryKey: ["accountability"] });
  const fail = (err: Error) => toast.error(err.message);

  // Check-ins update the row immediately; the week strip catches up on the refetch. `on` is the
  // day being logged — a weekly goal can be filled in for any day of the week, not just this one.
  const checkin = useMutation({
    mutationFn: (v: { task: AccountabilityTaskView; progress?: number; completed?: boolean; on?: string }) =>
      accountabilityApi.checkin(v.task.id, {
        date: v.on ?? date,
        progress: v.progress,
        completed: v.completed,
      }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      const on = v.on ?? date;
      qc.setQueryData(queryKey, (old: { data: AccountabilityDay } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            tasks: old.data.tasks.map((t) => {
              if (t.id !== v.task.id) return t;
              if (t.week) {
                const days = t.week.days.map((d) =>
                  d.date === on ? { ...d, progress: v.progress ?? d.progress } : d
                );
                const total = days.reduce((s, d) => s + d.progress, 0);
                return {
                  ...t,
                  progress: on === date ? (v.progress ?? t.progress) : t.progress,
                  completed: total >= (t.target ?? 1),
                  week: { ...t.week, days, total },
                };
              }
              const progress = v.progress ?? t.progress;
              const completed = v.completed ?? (t.target ? progress >= t.target : t.completed);
              return { ...t, progress, completed };
            }),
          },
        };
      });
      return { previous };
    },
    onError: (err: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      fail(err);
    },
    onSettled: refresh,
  });

  const saveTask = useMutation({
    mutationFn: ({ input, id }: { input: AccountabilityTaskInput; id?: string }) =>
      id ? accountabilityApi.updateTask(id, input) : accountabilityApi.createTask(input),
    onSuccess: (_r, { id }) => {
      toast.success(id ? "Task saved" : "Task added");
      setTaskDialogOpen(false);
      refresh();
    },
    onError: fail,
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => accountabilityApi.removeTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      setTaskDialogOpen(false);
      refresh();
    },
    onError: fail,
  });

  const addPerson = useMutation({
    mutationFn: accountabilityApi.createPerson,
    onSuccess: (r) => {
      toast.success(`Added ${r?.data?.name ?? "person"}`);
      refresh();
    },
    onError: fail,
  });
  const updatePerson = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; color?: string } }) =>
      accountabilityApi.updatePerson(id, input),
    onSuccess: refresh,
    onError: fail,
  });
  const removePerson = useMutation({
    mutationFn: accountabilityApi.removePerson,
    onSuccess: () => {
      toast.success("Removed");
      refresh();
    },
    onError: fail,
  });

  function toggle(task: AccountabilityTaskView) {
    if (task.target == null) return checkin.mutate({ task, completed: !task.completed });
    // A counted task: checking it fills the count; unchecking drops it just below the goal.
    return task.completed
      ? checkin.mutate({ task, completed: false, progress: Math.min(task.progress, task.target - 1) })
      : checkin.mutate({ task, completed: true, progress: Math.max(task.progress, task.target) });
  }

  function openNewTask(draft: TaskDraft = {}) {
    setTaskDraft(draft);
    setTaskDialogOpen(true);
  }

  function editTask(task: AccountabilityTaskView) {
    setTaskDraft(draftFromTask(task));
    setTaskDialogOpen(true);
  }

  // Group by person: "Me" first, then people in the order they were added. Each person has the
  // day's daily goals and the week's weekly goals.
  const groups = useMemo(() => {
    type Group = {
      key: string;
      person: AccountabilityPerson | null;
      name: string;
      tasks: AccountabilityTaskView[];
      goals: AccountabilityTaskView[];
    };
    const list: Group[] = [
      { key: ME_KEY, person: null, name: "Me", tasks: [], goals: [] },
      ...people.map((p) => ({ key: p.id, person: p, name: p.name, tasks: [], goals: [] }) as Group),
    ];
    for (const t of tasks) {
      const g = list.find((x) => x.key === (t.personId ?? ME_KEY));
      (t.period === "WEEKLY" ? g?.goals : g?.tasks)?.push(t);
    }
    return list;
  }, [people, tasks]);

  const dailyTasks = tasks.filter((t) => t.period !== "WEEKLY");

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) if (t.personId) counts[t.personId] = (counts[t.personId] ?? 0) + 1;
    return counts;
  }, [tasks]);

  const done = dailyTasks.filter((t) => t.completed).length;
  const isEmpty = !isLoading && tasks.length === 0 && people.length === 0 && day?.week.every((d) => d.total === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Accountability</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Daily tasks and weekly goals for you and the people who help you run the business.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPeopleOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Users className="h-4 w-4" />
            People{people.length ? ` (${people.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => openNewTask()}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Couldn&apos;t load your tasks: {(error as Error).message}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section className="min-w-0 rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
            {/* Day navigation + the day's overall progress */}
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <NavButton label="Previous day" onClick={() => setDate(shiftKey(date, -1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </NavButton>
                  <h2 className="min-w-[11rem] px-1 text-center text-base font-semibold text-zinc-900">
                    {date === today ? "Today" : fmtDay(date, { weekday: "long" })}
                    <span className="block text-xs font-normal text-zinc-500">
                      {fmtDay(date, { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </h2>
                  <NavButton label="Next day" onClick={() => setDate(shiftKey(date, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </NavButton>
                </div>
                {date !== today && (
                  <button
                    type="button"
                    onClick={() => setDate(today)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    Back to today
                  </button>
                )}
              </div>

              {dailyTasks.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-zinc-600">
                    <span className="font-semibold text-zinc-900">
                      {done} of {dailyTasks.length}
                    </span>{" "}
                    daily {dailyTasks.length === 1 ? "task" : "tasks"}{" "}
                    {done === dailyTasks.length ? "done — nice work." : "done"}
                  </p>
                  <div className="mt-2 flex h-2 gap-0.5" aria-hidden>
                    {dailyTasks.map((t) => (
                      <span
                        key={t.id}
                        className={`h-full flex-1 rounded-full transition-colors ${t.completed ? "bg-emerald-600" : "bg-zinc-200"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
              {isLoading ? (
                <div className="space-y-3 p-5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100" />
                  ))}
                </div>
              ) : isEmpty ? (
                <EmptyBoard onPick={openNewTask} />
              ) : (
                <div className="divide-y divide-zinc-100">
                  {groups
                    .filter((g) => g.tasks.length > 0 || g.goals.length > 0 || g.person)
                    .map((g) => {
                      const groupDone = g.tasks.filter((t) => t.completed).length;
                      const hasAny = g.tasks.length > 0 || g.goals.length > 0;
                      return (
                        <div key={g.key} className="px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar person={g.person} size={28} />
                              <h3 className="text-sm font-semibold text-zinc-900">{g.name}</h3>
                            </div>
                            {hasAny ? (
                              g.tasks.length > 0 && (
                                <span className="text-xs tabular-nums text-zinc-500">
                                  {groupDone}/{g.tasks.length} done {date === today ? "today" : "this day"}
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => openNewTask({ personId: g.person?.id ?? null })}
                                className="text-xs font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                              >
                                Give {g.name} a task
                              </button>
                            )}
                          </div>
                          {!hasAny && (
                            <p className="mt-2 pl-[38px] text-xs text-zinc-400">
                              Nothing due {date === today ? "today" : "this day"}.
                            </p>
                          )}
                          {g.tasks.length > 0 && (
                            <ul className="divide-y divide-zinc-100 pl-[38px]">
                              {g.tasks.map((t) => (
                                <TaskRow
                                  key={t.id}
                                  task={t}
                                  future={future}
                                  onToggle={toggle}
                                  onSet={(task, progress) =>
                                    checkin.mutate({ task, progress: Math.max(0, progress) })
                                  }
                                  onEdit={editTask}
                                />
                              ))}
                            </ul>
                          )}
                          {g.goals.length > 0 && (
                            <div className="mt-2 pl-[38px]">
                              <p className="mt-2 text-xs font-medium text-zinc-500">
                                This week · {fmtDay(day!.weekStart, { month: "short", day: "numeric" })}–
                                {fmtDay(day!.weekEnd, { month: "short", day: "numeric" })}
                              </p>
                              <ul className="divide-y divide-zinc-100">
                                {g.goals.map((t) => (
                                  <WeeklyGoalRow
                                    key={t.id}
                                    task={t}
                                    selected={date}
                                    today={today}
                                    onSet={(task, progress, on) => checkin.mutate({ task, progress, on })}
                                    onEdit={editTask}
                                  />
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {tasks.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-zinc-500">
                      Nothing scheduled for {date === today ? "today" : fmtDay(date, { weekday: "long", month: "short", day: "numeric" })}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Weekly scorecard</h2>
                {day && (
                  <span className="text-xs text-zinc-500">
                    {fmtDay(day.weekStart, { month: "short", day: "numeric" })}–
                    {fmtDay(day.weekEnd, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
              {day ? (
                <WeeklyScorecard tasks={tasks} people={people} today={today} />
              ) : (
                <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
              )}
              {day && (
                <div className="mt-4 flex justify-between border-t border-zinc-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setDate(shiftKey(day.weekStart, -7))}
                    className="font-medium text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    ‹ Previous week
                  </button>
                  {day.weekEnd < today && (
                    <button
                      type="button"
                      onClick={() => setDate(shiftKey(day.weekEnd, 1) > today ? today : shiftKey(day.weekEnd, 1))}
                      className="font-medium text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      Next week ›
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Last 7 days · daily tasks</h2>
              {day ? (
                <WeekLedger week={day.week} people={people} selected={date} today={today} onSelect={setDate} />
              ) : (
                <div className="h-32 animate-pulse rounded-xl bg-zinc-100" />
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">How tracking works</h2>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-600">
                <li>Daily tasks reset every day. Past days keep what got done.</li>
                <li>
                  Weekly goals run Monday to Sunday. Enter each day&apos;s count in the week row — a
                  day off is fine as long as the week adds up.
                </li>
                <li className="flex gap-1.5">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0 text-orange-500" aria-hidden />
                  <span>
                    Automatic tasks count what happens on your Omventa account — listings, new
                    inventory and sales — and check themselves off.
                  </span>
                </li>
                <li>People you add don&apos;t need a login; you check tasks off for them.</li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      <TaskDialog
        open={taskDialogOpen}
        draft={taskDraft}
        people={people}
        date={date < today ? today : date}
        saving={saveTask.isPending}
        onSave={(input, id) => saveTask.mutate({ input, id })}
        onDelete={(id) => deleteTask.mutate(id)}
        onClose={() => setTaskDialogOpen(false)}
      />
      <PeopleDialog
        open={peopleOpen}
        people={people}
        taskCounts={taskCounts}
        busy={addPerson.isPending}
        onAdd={(input) => addPerson.mutate(input)}
        onUpdate={(id, input) => updatePerson.mutate({ id, input })}
        onRemove={(id) => removePerson.mutate(id)}
        onClose={() => setPeopleOpen(false)}
      />
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      {children}
    </button>
  );
}

function EmptyBoard({ onPick }: { onPick: (draft: TaskDraft) => void }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-base font-semibold text-zinc-900">Set your first daily goal</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
        Pick a starting point or write your own. Goals like listing 10 items count themselves as
        you work in Omventa.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.draft)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm text-zinc-700 transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {s.draft.metric && s.draft.metric !== "MANUAL" && <Zap className="h-3.5 w-3.5 text-orange-500" aria-hidden />}
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPick({})}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-600 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Write your own
        </button>
      </div>
    </div>
  );
}
