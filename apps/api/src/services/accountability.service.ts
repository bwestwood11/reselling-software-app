import type { PrismaClient } from "@repo/db";
import type {
  AccountabilityDay,
  AccountabilityDayStat,
  AccountabilityMetric,
  AccountabilityPeriod,
  AccountabilityPerson,
  AccountabilitySchedule,
  AccountabilityTaskInput,
  AccountabilityTaskView,
} from "@repo/types";

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
/** Bucket key for the owner's own (unassigned) tasks. */
const ME = "me";

export class AccountabilityError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

/** YYYY-MM-DD ± n days, in pure calendar arithmetic (no time zone involved). */
function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD calendar date. */
function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/**
 * The instant a user's local day starts. `tzOffset` is the browser's
 * `Date.getTimezoneOffset()` — minutes *behind* UTC (240 for EDT).
 */
function localDayStart(date: string, tzOffset: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) + tzOffset * 60_000);
}

/** The user's local calendar date for an instant. */
function localDateOf(instant: Date, tzOffset: number): string {
  return new Date(instant.getTime() - tzOffset * 60_000).toISOString().slice(0, 10);
}

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  personId: string | null;
  target: number | null;
  metric: AccountabilityMetric;
  period: AccountabilityPeriod;
  schedule: AccountabilitySchedule;
  startDate: string;
  onDate: string | null;
  endDate: string | null;
}

/** Whether a DAILY task is due on a given day. */
function appliesOn(task: TaskRow, date: string): boolean {
  if (task.period === "WEEKLY") return false;
  if (task.schedule === "ONCE") return task.onDate === date;
  if (date < task.startDate) return false;
  if (task.endDate && date > task.endDate) return false;
  if (task.schedule === "WEEKDAYS") {
    const wd = weekday(date);
    return wd >= 1 && wd <= 5;
  }
  return true;
}

/** The Monday of the week containing a date. */
function mondayOf(date: string): string {
  return shiftDate(date, -((weekday(date) + 6) % 7));
}

/**
 * Whether a WEEKLY goal runs in the Monday–Sunday week ending on `weekEnd`. A goal with an end
 * date runs through the whole week containing it, so it never stops partway through a week.
 */
function runsInWeek(task: TaskRow, weekEnd: string): boolean {
  if (task.period !== "WEEKLY" || task.startDate > weekEnd) return false;
  return !task.endDate || shiftDate(weekEnd, -6) <= task.endDate;
}

export class AccountabilityService {
  constructor(private readonly db: PrismaClient) {}

  // ── Day view ──────────────────────────────────────────────────────────────

  async getDay(userId: string, date: string, tzOffset: number): Promise<AccountabilityDay> {
    // Two windows: the 7 days ending on `date` (daily ledger) and the Monday–Sunday week
    // containing it (weekly goals). Fetch check-ins and activity for their union once.
    const ledgerStart = shiftDate(date, -(WEEK_DAYS - 1));
    const weekStart = mondayOf(date);
    const weekEnd = shiftDate(weekStart, 6);
    const from = ledgerStart < weekStart ? ledgerStart : weekStart;
    const to = weekEnd > date ? weekEnd : date;

    const [people, tasks] = await Promise.all([
      this.db.accountabilityPerson.findMany({
        where: { userId, archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, color: true },
      }),
      this.db.accountabilityTask.findMany({
        where: { userId, archivedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          notes: true,
          personId: true,
          target: true,
          metric: true,
          period: true,
          schedule: true,
          startDate: true,
          onDate: true,
          endDate: true,
          checkins: {
            where: { date: { gte: from, lte: to } },
            select: { date: true, progress: true, completed: true },
          },
        },
      }),
    ]);

    const autoCounts = await this.autoCounts(
      userId,
      new Set(tasks.map((t) => t.metric).filter((m) => m !== "MANUAL")),
      localDayStart(from, tzOffset),
      new Date(localDayStart(to, tzOffset).getTime() + DAY_MS),
      tzOffset
    );

    /** A task's own count for one day — logged by hand, or counted from account activity. */
    const dayProgress = (task: (typeof tasks)[number], day: string): number =>
      task.metric === "MANUAL"
        ? (task.checkins.find((c) => c.date === day)?.progress ?? 0)
        : (autoCounts.get(task.metric)?.get(day) ?? 0);

    const view = (task: (typeof tasks)[number], day: string): AccountabilityTaskView => {
      const { checkins, ...rest } = task;
      const progress = dayProgress(task, day);
      if (task.period === "WEEKLY") {
        const days = Array.from({ length: WEEK_DAYS }, (_, i) => {
          const d = shiftDate(weekStart, i);
          return { date: d, progress: dayProgress(task, d) };
        });
        const total = days.reduce((sum, d) => sum + d.progress, 0);
        return {
          ...rest,
          progress,
          completed: total >= (task.target ?? 1),
          week: { start: weekStart, end: weekEnd, days, total },
        };
      }
      const completed =
        task.metric === "MANUAL"
          ? (checkins.find((c) => c.date === day)?.completed ?? false)
          : progress >= (task.target ?? 1);
      return { ...rest, progress, completed, week: null };
    };

    // The daily ledger counts daily goals only — a weekly goal isn't missed on any one day.
    const week: AccountabilityDayStat[] = [];
    for (let i = 0; i < WEEK_DAYS; i++) {
      const day = shiftDate(ledgerStart, i);
      const stat: AccountabilityDayStat = { date: day, done: 0, total: 0, byPerson: {} };
      for (const task of tasks) {
        if (!appliesOn(task, day)) continue;
        const key = task.personId ?? ME;
        const bucket = (stat.byPerson[key] ??= { done: 0, total: 0 });
        const done = view(task, day).completed;
        bucket.total++;
        stat.total++;
        if (done) {
          bucket.done++;
          stat.done++;
        }
      }
      week.push(stat);
    }

    return {
      date,
      weekStart,
      weekEnd,
      people: people as AccountabilityPerson[],
      tasks: tasks
        .filter((t) => appliesOn(t, date) || runsInWeek(t, weekEnd))
        .map((t) => view(t, date)),
      week,
    };
  }

  /**
   * Per-day counts of real account activity for the auto-tracked metrics in use, bucketed by
   * the user's local date. These count the whole account — people are not separate logins.
   */
  private async autoCounts(
    userId: string,
    metrics: Set<AccountabilityMetric>,
    from: Date,
    to: Date,
    tzOffset: number
  ): Promise<Map<AccountabilityMetric, Map<string, number>>> {
    const out = new Map<AccountabilityMetric, Map<string, number>>();
    const tally = (metric: AccountabilityMetric, instants: Array<Date | null>) => {
      const counts = new Map<string, number>();
      for (const at of instants) {
        if (!at) continue;
        const day = localDateOf(at, tzOffset);
        counts.set(day, (counts.get(day) ?? 0) + 1);
      }
      out.set(metric, counts);
    };

    await Promise.all([
      metrics.has("ITEMS_LISTED") &&
        // An item cross-listed to three marketplaces the same day is one item listed.
        this.db.listing
          .findMany({
            where: { userId, listedAt: { gte: from, lt: to } },
            select: { inventoryItemId: true, listedAt: true },
          })
          .then((rows) => {
            const seen = new Set<string>();
            tally(
              "ITEMS_LISTED",
              rows.flatMap((r) => {
                const key = `${r.inventoryItemId}|${localDateOf(r.listedAt!, tzOffset)}`;
                if (seen.has(key)) return [];
                seen.add(key);
                return [r.listedAt];
              })
            );
          }),
      metrics.has("ITEMS_ADDED") &&
        this.db.inventoryItem
          .findMany({ where: { userId, createdAt: { gte: from, lt: to } }, select: { createdAt: true } })
          .then((rows) => tally("ITEMS_ADDED", rows.map((r) => r.createdAt))),
      metrics.has("ITEMS_SOLD") &&
        this.db.inventoryItem
          .findMany({
            where: { userId, status: "SOLD", soldAt: { gte: from, lt: to } },
            select: { soldAt: true },
          })
          .then((rows) => tally("ITEMS_SOLD", rows.map((r) => r.soldAt))),
    ]);
    return out;
  }

  // ── People ────────────────────────────────────────────────────────────────

  async createPerson(userId: string, input: { name: string; color: string }) {
    return this.db.accountabilityPerson.create({
      data: { userId, name: input.name.trim(), color: input.color },
      select: { id: true, name: true, color: true },
    });
  }

  async updatePerson(userId: string, id: string, input: { name?: string; color?: string }) {
    await this.assertPerson(userId, id);
    return this.db.accountabilityPerson.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
      select: { id: true, name: true, color: true },
    });
  }

  /** Removing someone archives them and their tasks, so past days' history stays intact. */
  async removePerson(userId: string, id: string) {
    await this.assertPerson(userId, id);
    const now = new Date();
    await this.db.$transaction([
      this.db.accountabilityTask.updateMany({
        where: { userId, personId: id, archivedAt: null },
        data: { archivedAt: now },
      }),
      this.db.accountabilityPerson.update({ where: { id }, data: { archivedAt: now } }),
    ]);
  }

  private async assertPerson(userId: string, id: string) {
    const person = await this.db.accountabilityPerson.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });
    if (!person) throw new AccountabilityError("Person not found", 404);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  private async taskData(userId: string, input: AccountabilityTaskInput) {
    if (input.personId) await this.assertPerson(userId, input.personId);
    const metric = input.metric ?? "MANUAL";
    const period = input.period ?? "DAILY";
    const target = input.target ?? null;
    if (period === "WEEKLY" && !target) {
      throw new AccountabilityError("Weekly goals need a target for the week");
    }
    if (metric !== "MANUAL" && !target) {
      throw new AccountabilityError("Auto-tracked tasks need a daily target");
    }
    // A weekly goal runs every week from the one it was added in; it has no day schedule.
    const schedule = period === "WEEKLY" ? "DAILY" : (input.schedule ?? "DAILY");
    const startDate = period === "WEEKLY" ? mondayOf(input.startDate) : input.startDate;
    // A one-off task is a single day, so an end date doesn't apply to it.
    const endDate = schedule === "ONCE" ? null : (input.endDate ?? null);
    if (endDate && endDate < startDate) {
      throw new AccountabilityError("The end date can't be before the task starts");
    }
    return {
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      personId: input.personId ?? null,
      target,
      metric,
      period,
      schedule,
      startDate,
      onDate: schedule === "ONCE" ? input.startDate : null,
      endDate,
    };
  }

  async createTask(userId: string, input: AccountabilityTaskInput) {
    const data = await this.taskData(userId, input);
    const last = await this.db.accountabilityTask.findFirst({
      where: { userId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return this.db.accountabilityTask.create({
      data: { ...data, userId, sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true },
    });
  }

  async updateTask(userId: string, id: string, input: AccountabilityTaskInput) {
    await this.assertTask(userId, id);
    const data = await this.taskData(userId, input);
    return this.db.accountabilityTask.update({ where: { id }, data, select: { id: true } });
  }

  /** Deleted tasks are archived, so they drop off every day but past history isn't rewritten. */
  async removeTask(userId: string, id: string) {
    await this.assertTask(userId, id);
    await this.db.accountabilityTask.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  /**
   * Record a manual task's state for a day. With a target, `progress` is the count and the task
   * completes when it reaches the target (unless `completed` is given explicitly).
   */
  async checkin(
    userId: string,
    id: string,
    input: { date: string; progress?: number; completed?: boolean }
  ) {
    const task = await this.assertTask(userId, id);
    if (task.metric !== "MANUAL") {
      throw new AccountabilityError("This task is tracked automatically from your account activity");
    }
    const existing = await this.db.accountabilityCheckin.findUnique({
      where: { taskId_date: { taskId: id, date: input.date } },
    });
    const progress = Math.max(0, input.progress ?? existing?.progress ?? 0);
    // A weekly goal's check-in is just that day's count — completion is judged on the week total.
    const completed =
      task.period === "WEEKLY"
        ? false
        : (input.completed ??
          (task.target ? progress >= task.target : (existing?.completed ?? false)));
    const completedAt = completed ? (existing?.completedAt ?? new Date()) : null;
    await this.db.accountabilityCheckin.upsert({
      where: { taskId_date: { taskId: id, date: input.date } },
      create: { taskId: id, date: input.date, progress, completed, completedAt },
      update: { progress, completed, completedAt },
    });
    return { progress, completed };
  }

  private async assertTask(userId: string, id: string) {
    const task = await this.db.accountabilityTask.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true, metric: true, target: true, period: true },
    });
    if (!task) throw new AccountabilityError("Task not found", 404);
    return task;
  }
}
