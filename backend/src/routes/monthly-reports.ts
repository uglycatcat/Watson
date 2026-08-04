import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { MonthlyReportService } from "../services/monthly-report.service.js";

const monthPattern = /^\d{4}-\d{2}$/;

function isCalendarMonth(value: string): boolean {
  if (!monthPattern.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

const snapshotSchema = z
  .object({
    goal: z.string(),
    result: z.string(),
    analysis: z.string(),
  })
  .strict();

export async function monthlyReportsRoutes(
  app: FastifyInstance,
  monthlyReportService: MonthlyReportService,
) {
  app.get("/api/monthly-reports/:month", async (request, reply) => {
    const { month } = request.params as { month: string };
    if (!isCalendarMonth(month)) {
      return reply.status(400).send({ error: "Invalid month" });
    }
    return { item: monthlyReportService.get(month) };
  });

  app.put("/api/monthly-reports/:month", async (request, reply) => {
    const { month } = request.params as { month: string };
    if (!isCalendarMonth(month)) {
      return reply.status(400).send({ error: "Invalid month" });
    }

    const parsed = snapshotSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid monthly report" });
    }

    return monthlyReportService.upsert(month, parsed.data);
  });
}
