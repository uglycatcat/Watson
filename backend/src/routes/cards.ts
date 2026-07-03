import type { FastifyInstance } from "fastify";
import type { ScheduleService } from "../services/schedule.service.js";
import type { PriorityLevel, TimeNature } from "../types.js";

export async function cardsRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/api/cards", async (request) => {
    const q = request.query as Record<string, string | undefined>;
    const items = scheduleService.listAll({
      view: q.view as "day" | "week" | "month" | "all" | undefined,
      date: q.date,
      categoryId: q.categoryId,
      importance: q.importance as PriorityLevel | undefined,
      urgency: q.urgency as PriorityLevel | undefined,
      timeNature: q.timeNature as TimeNature | undefined,
      sort: q.sort as "time" | "priority" | undefined,
    });
    return { items };
  });

  app.get("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = scheduleService.getById(id);
    if (!card) return reply.status(404).send({ error: "Not found" });
    return card;
  });

  app.post("/api/cards", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    try {
      const card = scheduleService.create({
        title: String(body.title),
        description: body.description ? String(body.description) : null,
        timeNature: body.timeNature as TimeNature,
        startAt: body.startAt ? String(body.startAt) : null,
        endAt: body.endAt ? String(body.endAt) : null,
        deadlineAt: body.deadlineAt ? String(body.deadlineAt) : null,
        importance: body.importance as PriorityLevel | undefined,
        urgency: body.urgency as PriorityLevel | undefined,
        categoryId: body.categoryId ? String(body.categoryId) : undefined,
        categoryName: body.categoryName ? String(body.categoryName) : undefined,
      });
      return reply.status(201).send(card);
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 400).send({ error: err.message });
    }
  });

  app.patch("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    try {
      const card = scheduleService.update(id, {
        title: body.title ? String(body.title) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
        timeNature: body.timeNature as TimeNature | undefined,
        startAt: body.startAt !== undefined ? String(body.startAt) : undefined,
        endAt: body.endAt !== undefined ? String(body.endAt) : undefined,
        deadlineAt: body.deadlineAt !== undefined ? String(body.deadlineAt) : undefined,
        importance: body.importance as PriorityLevel | undefined,
        urgency: body.urgency as PriorityLevel | undefined,
        categoryId: body.categoryId ? String(body.categoryId) : undefined,
        categoryName: body.categoryName ? String(body.categoryName) : undefined,
      });
      if (!card) return reply.status(404).send({ error: "Not found" });
      return card;
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 400).send({ error: err.message });
    }
  });

  app.delete("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = scheduleService.delete(id);
    if (!ok) return reply.status(404).send({ error: "Not found" });
    return reply.status(204).send();
  });
}
