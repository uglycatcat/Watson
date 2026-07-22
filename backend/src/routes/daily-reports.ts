import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DailyReportService } from "../services/daily-report.service.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const snapshotSchema = z
  .object({
    goal: z.string().optional(),
    result: z.string().optional(),
    analysis: z.string().optional(),
  })
  .strict();

export async function dailyReportsRoutes(
  app: FastifyInstance,
  dailyReportService: DailyReportService,
) {
  app.get("/api/daily-reports/:date", async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!isCalendarDate(date)) {
      return reply.status(400).send({ error: "Invalid date" });
    }
    return { item: dailyReportService.get(date) };
  });

  app.put("/api/daily-reports/:date", async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!isCalendarDate(date)) {
      return reply.status(400).send({ error: "Invalid date" });
    }

    const parsed = snapshotSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid daily report" });
    }

    return dailyReportService.upsert(date, parsed.data);
  });
}
