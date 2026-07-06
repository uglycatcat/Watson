import type { FastifyInstance } from "fastify";
import type { ScheduleService } from "../services/schedule.service.js";
import type { PriorityLevel, TimeNature } from "../types.js";

export async function cardsRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/api/cards", async (request) => {
    const q = request.query as Record<string, string | undefined>;
    const hasTime =
      q.hasTime === "true" ? true : q.hasTime === "false" ? false : undefined;
    const items = scheduleService.listAll({
      view: q.view as "day" | "week" | "month" | "all" | undefined,
      date: q.date,
      categoryId: q.categoryId,
      importance: q.importance as PriorityLevel | undefined,
      urgency: q.urgency as PriorityLevel | undefined,
      timeNature: q.timeNature as TimeNature | undefined,
      hasTime,
      sort: q.sort as "time" | "priority" | "title" | "createdAt" | undefined,
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
      const timeNature =
        body.timeNature === null || body.timeNature === undefined
          ? null
          : (body.timeNature as TimeNature);
      const card = scheduleService.create({
        title: String(body.title ?? ""),
        description: body.description ? String(body.description) : null,
        timeNature,
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
      const patch: Parameters<ScheduleService["update"]>[1] = {};
      if (body.title !== undefined) patch.title = String(body.title);
      if (body.description !== undefined) patch.description = String(body.description);
      if ("timeNature" in body) {
        patch.timeNature =
          body.timeNature === null ? null : (body.timeNature as TimeNature);
      }
      if (body.startAt !== undefined) patch.startAt = body.startAt ? String(body.startAt) : null;
      if (body.endAt !== undefined) patch.endAt = body.endAt ? String(body.endAt) : null;
      if (body.deadlineAt !== undefined) {
        patch.deadlineAt = body.deadlineAt ? String(body.deadlineAt) : null;
      }
      if (body.importance !== undefined) patch.importance = body.importance as PriorityLevel;
      if (body.urgency !== undefined) patch.urgency = body.urgency as PriorityLevel;
      if (body.categoryId !== undefined) patch.categoryId = String(body.categoryId);
      if (body.categoryName !== undefined) patch.categoryName = String(body.categoryName);

      const card = scheduleService.update(id, patch);
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
