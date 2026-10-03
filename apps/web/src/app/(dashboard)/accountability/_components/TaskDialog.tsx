"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import type {
  AccountabilityMetric,
  AccountabilityPeriod,
  AccountabilityPerson,
  AccountabilitySchedule,
  AccountabilityTaskInput,
  AccountabilityTaskView,
} from "@repo/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ME_KEY, METRIC_LABELS, fmtDay, mondayKey, shiftKey } from "./shared";

type Tracking = "check" | "count" | "auto";

/** Pre-filled values for a new task (from a starter suggestion) or an existing task to edit. */
export type TaskDraft = Partial<AccountabilityTaskInput> & { id?: string };

export function draftFromTask(task: AccountabilityTaskView): TaskDraft {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    personId: task.personId,
    target: task.target,
    metric: task.metric,
    period: task.period,
    schedule: task.schedule,
    startDate: task.onDate ?? task.startDate,
    endDate: task.endDate,
  };
}

interface Props {
  open: boolean;
  draft: TaskDraft | null;
  people: AccountabilityPerson[];
  /** The day being viewed — new tasks start on it, and "only this day" means it. */
  date: string;
  saving: boolean;
  onSave: (input: AccountabilityTaskInput, id?: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TaskDialog({ open, draft, people, date, saving, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [personKey, setPersonKey] = useState(ME_KEY);
  const [period, setPeriod] = useState<AccountabilityPeriod>("DAILY");
  const [tracking, setTracking] = useState<Tracking>("check");
  const [metric, setMetric] = useState<Exclude<AccountabilityMetric, "MANUAL">>("ITEMS_LISTED");
  const [target, setTarget] = useState("10");
  const [schedule, setSchedule] = useState<AccountabilitySchedule>("DAILY");
  const [notes, setNotes] = useState("");
  const [ends, setEnds] = useState<"never" | "date">("never");
  const [endDate, setEndDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = draft ?? {};
    setTitle(d.title ?? "");
    setPersonKey(d.personId ?? ME_KEY);
    setPeriod(d.period ?? "DAILY");
    setTracking(
      d.metric && d.metric !== "MANUAL" ? "auto" : d.target || d.period === "WEEKLY" ? "count" : "check"
    );
    setMetric(d.metric && d.metric !== "MANUAL" ? d.metric : "ITEMS_LISTED");
    setTarget(String(d.target ?? 10));
    setSchedule(d.schedule ?? "DAILY");
    setNotes(d.notes ?? "");
    setEnds(d.endDate ? "date" : "never");
    // Suggest four weeks out when switching on an end date for the first time.
    setEndDate(d.endDate ?? shiftKey(d.startDate ?? date, 27));
    setConfirmDelete(false);
    setError(null);
  }, [open, draft]);

  const editing = Boolean(draft?.id);
  const weekly = period === "WEEKLY";
  const onceDate = editing && draft?.schedule === "ONCE" && draft.startDate ? draft.startDate : date;
  const oneOff = !weekly && schedule === "ONCE";
  const startKey = editing ? (draft?.startDate ?? date) : date;
  // The earliest end date allowed: a weekly goal can end any day of the week it starts in.
  const minEnd = weekly ? mondayKey(startKey) : startKey;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give the task a name.");
    if (!oneOff && ends === "date" && (!endDate || endDate < minEnd)) {
      return setError("Pick an end date on or after the day the task starts.");
    }
    const goal = Number(target);
    // A weekly goal is always a count — "check off" doesn't apply to a week.
    const effectiveTracking: Tracking = weekly && tracking === "check" ? "count" : tracking;
    if (effectiveTracking !== "check" && (!Number.isInteger(goal) || goal < 1)) {
      return setError(`The ${weekly ? "weekly" : "daily"} goal needs to be a whole number of 1 or more.`);
    }
    onSave(
      {
        title: title.trim(),
        notes: notes.trim() || null,
        personId: personKey === ME_KEY ? null : personKey,
        target: effectiveTracking === "check" ? null : goal,
        metric: effectiveTracking === "auto" ? metric : "MANUAL",
        period,
        schedule: weekly ? "DAILY" : schedule,
        // Editing keeps the original start; a new task starts on the day being viewed.
        startDate: oneOff ? onceDate : startKey,
        endDate: !oneOff && ends === "date" ? endDate : null,
      },
      draft?.id
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "Add a task"}</DialogTitle>
            <DialogDescription>
              Daily goals reset each morning. Weekly goals add up each day&apos;s count from Monday
              to Sunday, so a day off doesn&apos;t count against anyone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. List 10 items"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Who&apos;s responsible</Label>
            <Select value={personKey} onValueChange={(v) => v && setPersonKey(v)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value={ME_KEY}>Me</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-zinc-900">Goal period</legend>
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {(
                [
                  ["DAILY", "Daily goal"],
                  ["WEEKLY", "Weekly goal"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400 ${
                    period === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="period"
                    value={value}
                    checked={period === value}
                    onChange={() => {
                      setPeriod(value);
                      if (value === "WEEKLY" && tracking === "check") setTracking("count");
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-zinc-900">How it&apos;s tracked</legend>
            <div className={`grid gap-2 ${weekly ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {(
                [
                  ["check", "Check off", "Done or not done"],
                  ["count", weekly ? "Log each day" : "Count to a goal", weekly ? "Enter each day's count" : "Tap + as you go"],
                  ["auto", "Count automatically", "From your Omventa activity"],
                ] as const
              )
                .filter(([value]) => !(weekly && value === "check"))
                .map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400 ${
                    tracking === value ? "border-orange-400 bg-orange-50" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="tracking"
                    value={value}
                    checked={tracking === value}
                    onChange={() => setTracking(value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-zinc-900">{label}</span>
                  <span className="block text-xs text-zinc-500">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {tracking !== "check" && (
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              {tracking === "auto" ? (
                <div className="space-y-1.5">
                  <Label>What to count</Label>
                  <Select value={metric} onValueChange={(v) => v && setMetric(v as typeof metric)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Object.entries(METRIC_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="self-end pb-2 text-xs text-zinc-500">
                  {weekly
                    ? "Each day gets its own count; the week's total is what's judged."
                    : "Done once the count reaches the goal."}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="task-target">{weekly ? "Weekly goal" : "Daily goal"}</Label>
                <Input
                  id="task-target"
                  type="number"
                  min={1}
                  max={10000}
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              {tracking === "auto" && (
                <p className="text-xs text-zinc-500 sm:col-span-2">
                  Counts everything on your Omventa account {weekly ? "each day of the week" : "that day"},
                  whoever did it. An item cross-listed to several marketplaces counts once.
                </p>
              )}
            </div>
          )}

          {weekly ? (
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">
              Runs Monday to Sunday, starting this week. The total resets each Monday.
            </p>
          ) : (
          <div className="space-y-1.5">
            <Label>Repeats</Label>
            <Select value={schedule} onValueChange={(v) => v && setSchedule(v as AccountabilitySchedule)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="DAILY">Every day</SelectItem>
                <SelectItem value="WEEKDAYS">Weekdays (Mon–Fri)</SelectItem>
                <SelectItem value="ONCE">
                  Only on {fmtDay(onceDate, { weekday: "short", month: "short", day: "numeric" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {!oneOff && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-zinc-900">Ends</legend>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  {(
                    [
                      ["never", "Never — keep going"],
                      ["date", "On a date"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400 ${
                        ends === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ends"
                        value={value}
                        checked={ends === value}
                        onChange={() => setEnds(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {ends === "date" && (
                  <Input
                    type="date"
                    aria-label="End date"
                    value={endDate}
                    min={minEnd}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 w-auto bg-white"
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                {ends === "never"
                  ? `Repeats ${weekly ? "every week" : schedule === "WEEKDAYS" ? "every weekday" : "every day"} with no end date.`
                  : weekly
                    ? "Runs through the whole week containing this date, then stops."
                    : "Runs through this date, then stops."}{" "}
                Past {weekly ? "weeks" : "days"} keep their history either way.
              </p>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notes (optional)</Label>
            <Textarea
              id="task-notes"
              value={notes}
              maxLength={500}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything that helps get it done"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
            {editing ? (
              confirmDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-600">Delete this task?</span>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(draft!.id!)}>
                    Delete
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" className="text-zinc-500 hover:text-red-600" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete task
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-600 text-white hover:bg-orange-500">
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {editing ? "Save task" : "Add task"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
