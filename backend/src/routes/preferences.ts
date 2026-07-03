import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.js";
import { ownerPreferences } from "../db/schema.js";
import { nowIso } from "../types.js";

export async function preferencesRoutes(app: FastifyInstance, db: Db) {
  app.get("/api/preferences", async () => {
    const prefs = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    if (!prefs) return { dueSoonDays: 7, theme: "system", timezone: "Asia/Shanghai", updatedAt: nowIso() };
    return {
      dueSoonDays: prefs.dueSoonDays,
      theme: prefs.theme,
      timezone: prefs.timezone,
      updatedAt: prefs.updatedAt,
    };
  });

  app.patch("/api/preferences", async (request, reply) => {
    const body = request.body as {
      dueSoonDays?: number;
      theme?: "light" | "dark" | "system";
      timezone?: string;
    };
    const existing = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const updated = {
      dueSoonDays: body.dueSoonDays ?? existing.dueSoonDays,
      theme: body.theme ?? existing.theme,
      timezone: body.timezone ?? existing.timezone,
      updatedAt: nowIso(),
    };
    db.update(ownerPreferences).set(updated).where(eq(ownerPreferences.id, 1)).run();
    return updated;
  });
}
