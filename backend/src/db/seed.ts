import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "./index.js";
import { categories, ownerPreferences } from "./schema.js";

const PRESET_CATEGORIES = ["工作", "个人", "健康"];

export function seedDatabase(db: Db) {
  const now = new Date().toISOString();

  for (const name of PRESET_CATEGORIES) {
    const existing = db
      .select()
      .from(categories)
      .where(eq(categories.nameLower, name.toLowerCase()))
      .get();
    if (!existing) {
      db.insert(categories)
        .values({
          id: randomUUID(),
          name,
          nameLower: name.toLowerCase(),
          isPreset: true,
          createdAt: now,
        })
        .run();
    }
  }

  const prefs = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
  if (!prefs) {
    db.insert(ownerPreferences)
      .values({
        id: 1,
        dueSoonDays: 7,
        theme: "system",
        timezone: "Asia/Shanghai",
        updatedAt: now,
      })
      .run();
  }
}
