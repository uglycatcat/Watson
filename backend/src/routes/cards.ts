import type { FastifyInstance } from "fastify";
import type { ScheduleService } from "../services/schedule.service.js";
import { isCardStage } from "../types.js";

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a required priority (importance/urgency) from a request body value.
 *  Throws 400 on non-finite input so NaN can never be persisted. */
function parsePriority(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw Object.assign(new Error(`${field} must be a number`), { statusCode: 400 });
  }
  return n;
}

function handleServiceError(
  e: unknown,
  reply: { status: (code: number) => { send: (body: { error: string }) => unknown } },
) {
  const err = e as { statusCode?: number; message?: string };
  return reply.status(err.statusCode ?? 400).send({ error: err.message ?? "Bad request" });
}

export async function cardsRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/api/cards", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    if (q.stage !== undefined && !isCardStage(q.stage)) {
      return reply.status(400).send({ error: "Invalid stage" });
    }
    // Stage filter: all-view list, or undated day fetch used by AllView quadrant (all standards).
    if (q.stage !== undefined && q.view !== "all" && !(q.view === "day" && !q.date)) {
      return reply.status(400).send({ error: "Stage filter is only supported for view=all" });
    }
    const scheduled =
      q.scheduled === "true" ? true : q.scheduled === "false" ? false : undefined;
    const items = scheduleService.listAll({
      view: q.view as "day" | "week" | "month" | "all" | "trash" | undefined,
      date: q.date,
      categoryId: q.categoryId,
      importance: parseOptionalInt(q.importance),
      urgency: parseOptionalInt(q.urgency),
      scheduled,
      stage: q.stage,
      sort: q.sort as "time" | "priority" | "title" | "createdAt" | undefined,
    });
    return { items };
  });

  app.post("/api/cards/compose", async (request, reply) => {
    const body =
      request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)
        : {};
    try {
      const cardIds = Array.isArray(body.cardIds)
        ? body.cardIds.map((id) => String(id))
        : [];
      const card = scheduleService.compose({
        cardIds,
        title: String(body.title ?? ""),
        startAt: body.startAt !== undefined ? (body.startAt ? String(body.startAt) : null) : undefined,
        endAt: body.endAt !== undefined ? (body.endAt ? String(body.endAt) : null) : undefined,
      });
      return reply.status(201).send(card);
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.get("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = scheduleService.getById(id);
    if (!card) return reply.status(404).send({ error: "Not found" });
    return card;
  });

  app.post("/api/cards", async (request, reply) => {
    const body =
      request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)
        : {};
    try {
      if (body.stage !== undefined && !isCardStage(body.stage)) {
        return reply.status(400).send({ error: "Invalid stage" });
      }
      const card = scheduleService.create({
        title: String(body.title ?? ""),
        description: body.description ? String(body.description) : null,
        startAt: body.startAt ? String(body.startAt) : null,
        endAt: body.endAt ? String(body.endAt) : null,
        importance: body.importance != null ? parsePriority(body.importance, "importance") : undefined,
        urgency: body.urgency != null ? parsePriority(body.urgency, "urgency") : undefined,
        categoryId: body.categoryId ? String(body.categoryId) : undefined,
        categoryName: body.categoryName ? String(body.categoryName) : undefined,
        stage: body.stage,
      });
      return reply.status(201).send(card);
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.patch("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body =
      request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)
        : {};
    try {
      if (body.stage !== undefined && !isCardStage(body.stage)) {
        return reply.status(400).send({ error: "Invalid stage" });
      }
      const patch: Parameters<ScheduleService["update"]>[1] = {};
      if (body.title !== undefined) patch.title = String(body.title);
      if (body.description !== undefined)
        patch.description = body.description == null ? null : String(body.description);
      if (body.startAt !== undefined) patch.startAt = body.startAt ? String(body.startAt) : null;
      if (body.endAt !== undefined) patch.endAt = body.endAt ? String(body.endAt) : null;
      if (body.importance !== undefined) patch.importance = parsePriority(body.importance, "importance");
      if (body.urgency !== undefined) patch.urgency = parsePriority(body.urgency, "urgency");
      if (body.categoryId !== undefined) patch.categoryId = String(body.categoryId);
      if (body.categoryName !== undefined) patch.categoryName = String(body.categoryName);
      if (body.stage !== undefined) patch.stage = body.stage;

      const card = scheduleService.update(id, patch);
      if (!card) return reply.status(404).send({ error: "Not found" });
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.post("/api/cards/:parentId/children", async (request, reply) => {
    const { parentId } = request.params as { parentId: string };
    const body =
      request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)
        : {};
    try {
      const cardId = String(body.cardId ?? "");
      if (!cardId) return reply.status(400).send({ error: "cardId required" });
      const card = scheduleService.addChild(parentId, cardId);
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.post("/api/cards/:parentId/merge", async (request, reply) => {
    const { parentId } = request.params as { parentId: string };
    const body =
      request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)
        : {};
    try {
      const sourceParentId = String(body.sourceParentId ?? "");
      if (!sourceParentId) return reply.status(400).send({ error: "sourceParentId required" });
      const card = scheduleService.mergeParents(parentId, sourceParentId);
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.post("/api/cards/:cardId/detach", async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    try {
      const card = scheduleService.detachChild(cardId);
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.post("/api/cards/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const card = scheduleService.complete(id);
      if (!card) return reply.status(404).send({ error: "Not found" });
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.post("/api/cards/:id/restore", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const card = scheduleService.restore(id);
      if (!card) return reply.status(404).send({ error: "Not found" });
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.delete("/api/cards/:id/permanent", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const ok = scheduleService.permanentDelete(id);
      if (!ok) return reply.status(404).send({ error: "Not found" });
      return reply.status(204).send();
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });

  app.delete("/api/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const card = scheduleService.delete(id);
      if (!card) return reply.status(404).send({ error: "Not found" });
      return card;
    } catch (e) {
      return handleServiceError(e, reply);
    }
  });
}
