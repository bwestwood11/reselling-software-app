import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { AccountabilityError, AccountabilityService } from "../services/accountability.service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a hex color");

const daySchema = z.object({
  date: dateSchema,
  // Browser Date.getTimezoneOffset(): minutes behind UTC (−840 … 720).
  tz: z.coerce.number().int().min(-840).max(720).default(0),
});

const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  color: colorSchema,
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  notes: z.string().max(500).nullish(),
  personId: z.string().min(1).nullish(),
  target: z.number().int().min(1).max(10_000).nullish(),
  metric: z.enum(["MANUAL", "ITEMS_LISTED", "ITEMS_ADDED", "ITEMS_SOLD"]).default("MANUAL"),
  period: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  schedule: z.enum(["DAILY", "WEEKDAYS", "ONCE"]).default("DAILY"),
  startDate: dateSchema,
  endDate: dateSchema.nullish(),
});

const checkinSchema = z.object({
  date: dateSchema,
  progress: z.number().int().min(0).max(10_000).optional(),
  completed: z.boolean().optional(),
});

/** Validation and AccountabilityError → a { success: false, error } reply. */
async function handle<T>(reply: FastifyReply, fn: () => Promise<T>) {
  try {
    const data = await fn();
    return reply.send({ success: true, ...(data !== undefined ? { data } : {}) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: err.issues[0]?.message ?? "Invalid input" });
    }
    if (err instanceof AccountabilityError) {
      return reply.status(err.status).send({ success: false, error: err.message });
    }
    throw err;
  }
}

export async function accountabilityRoutes(fastify: FastifyInstance) {
  const svc = new AccountabilityService(fastify.prisma);
  const pre = { preHandler: [requireAuth, requireActiveSubscription] };

  // GET /api/accountability?date=YYYY-MM-DD&tz=240 — tasks due that day + the 7-day strip
  fastify.get("/", pre, (request, reply) =>
    handle(reply, async () => {
      const { date, tz } = daySchema.parse(request.query);
      return svc.getDay(request.user!.id, date, tz);
    })
  );

  fastify.post("/people", pre, (request, reply) =>
    handle(reply, () => svc.createPerson(request.user!.id, personSchema.parse(request.body)))
  );

  fastify.patch("/people/:id", pre, (request, reply) =>
    handle(reply, () =>
      svc.updatePerson(
        request.user!.id,
        (request.params as { id: string }).id,
        personSchema.partial().parse(request.body)
      )
    )
  );

  fastify.delete("/people/:id", pre, (request, reply) =>
    handle(reply, () => svc.removePerson(request.user!.id, (request.params as { id: string }).id))
  );

  fastify.post("/tasks", pre, (request, reply) =>
    handle(reply, () => svc.createTask(request.user!.id, taskSchema.parse(request.body)))
  );

  fastify.put("/tasks/:id", pre, (request, reply) =>
    handle(reply, () =>
      svc.updateTask(
        request.user!.id,
        (request.params as { id: string }).id,
        taskSchema.parse(request.body)
      )
    )
  );

  fastify.delete("/tasks/:id", pre, (request, reply) =>
    handle(reply, () => svc.removeTask(request.user!.id, (request.params as { id: string }).id))
  );

  // PUT /api/accountability/tasks/:id/checkin — check off / count up a manual task for a day
  fastify.put("/tasks/:id/checkin", pre, (request, reply) =>
    handle(reply, () =>
      svc.checkin(
        request.user!.id,
        (request.params as { id: string }).id,
        checkinSchema.parse(request.body)
      )
    )
  );
}
