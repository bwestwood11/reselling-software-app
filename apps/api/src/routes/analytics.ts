import type { FastifyInstance } from "fastify";
import { requireAuth, requireActiveSubscription } from "../middleware/auth";
import { AnalyticsService, MAX_ANALYTICS_RANGE_DAYS } from "../services/analytics.service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function analyticsRoutes(fastify: FastifyInstance) {
  const svc = new AnalyticsService(fastify.prisma);

  // GET /api/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD — sales report for an inclusive date
  // range, compared against the equally long period just before it.
  fastify.get(
    "/",
    { preHandler: [requireAuth, requireActiveSubscription] },
    async (request, reply) => {
      const { start, end } = request.query as { start?: string; end?: string };
      if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
        return reply
          .status(400)
          .send({ success: false, error: "start and end are required (YYYY-MM-DD)" });
      }
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
        return reply.status(400).send({ success: false, error: "Invalid date range" });
      }
      const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
      if (spanDays > MAX_ANALYTICS_RANGE_DAYS) {
        return reply
          .status(400)
          .send({ success: false, error: "Date range can't exceed 5 years" });
      }

      const data = await svc.getReport(request.user!.id, startDate, endDate);
      return reply.send({ success: true, data });
    }
  );
}
