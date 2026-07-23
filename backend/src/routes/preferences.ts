import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.js";
import { ownerPreferences } from "../db/schema.js";
import { nowIso } from "../types.js";

type ThemeId = "console" | "spacex" | "light" | "dark" | "system";

/** Persist only product theme ids; map legacy light/dark/system. */
function persistTheme(raw?: ThemeId): "console" | "spacex" | undefined {
  if (!raw) return undefined;
  if (raw === "spacex" || raw === "light") return "spacex";
  if (raw === "console" || raw === "dark" || raw === "system") return "console";
  return undefined;
}

export async function preferencesRoutes(app: FastifyInstance, db: Db) {
  app.get("/api/preferences", async () => {
    const prefs = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    if (!prefs) return { dueSoonDays: 7, theme: "console", timezone: "Asia/Shanghai", updatedAt: nowIso() };
    return {
      dueSoonDays: prefs.dueSoonDays,
      theme: persistTheme(prefs.theme as ThemeId) ?? "console",
      timezone: prefs.timezone,
      updatedAt: prefs.updatedAt,
    };
  });

  app.patch("/api/preferences", async (request, reply) => {
    const body = request.body as {
      dueSoonDays?: number;
      theme?: ThemeId;
      timezone?: string;
    };
    const existing = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const nextTheme =
      persistTheme(body.theme) ?? persistTheme(existing.theme as ThemeId) ?? "console";

    const updated = {
      dueSoonDays: body.dueSoonDays ?? existing.dueSoonDays,
      theme: nextTheme,
      timezone: body.timezone ?? existing.timezone,
      updatedAt: nowIso(),
    };
    db.update(ownerPreferences).set(updated).where(eq(ownerPreferences.id, 1)).run();
    return updated;
  });
}
