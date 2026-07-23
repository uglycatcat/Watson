import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "./index.js";
import { categories, ownerPreferences } from "./schema.js";
import { allocateCategoryColor, isPaletteColor } from "../lib/categoryColors.js";

const PRESET_CATEGORIES = ["工作", "个人", "健康"];
const NONE_CATEGORY = "无";

function usedPaletteColors(db: Db): string[] {
  return db
    .select({ color: categories.color })
    .from(categories)
    .all()
    .map((r) => r.color)
    .filter((c): c is string => isPaletteColor(c));
}

/** Fill missing colors and migrate any hex outside the current dark-friendly palette. */
function ensureAllHaveColors(db: Db) {
  const rows = db.select().from(categories).all();
  const used = usedPaletteColors(db);
  for (const row of rows) {
    if (isPaletteColor(row.color)) continue;
    const color = allocateCategoryColor(used);
    used.push(color);
    db.update(categories).set({ color }).where(eq(categories.id, row.id)).run();
  }
}

export function seedDatabase(db: Db) {
  const now = new Date().toISOString();
  const prefs = db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();

  if (!prefs) {
    for (const name of PRESET_CATEGORIES) {
      const existing = db
        .select()
        .from(categories)
        .where(eq(categories.nameLower, name.toLowerCase()))
        .get();
      if (!existing) {
        const color = allocateCategoryColor(usedPaletteColors(db));
        db.insert(categories)
          .values({
            id: randomUUID(),
            name,
            nameLower: name.toLowerCase(),
            isPreset: true,
            color,
            createdAt: now,
          })
          .run();
      }
    }
  }

  const none = db
    .select()
    .from(categories)
    .where(eq(categories.nameLower, NONE_CATEGORY))
    .get();
  if (!none) {
    const color = allocateCategoryColor(usedPaletteColors(db));
    db.insert(categories)
      .values({
        id: "system-none",
        name: NONE_CATEGORY,
        nameLower: NONE_CATEGORY,
        isPreset: true,
        color,
        createdAt: now,
      })
      .run();
  } else if (!none.isPreset) {
    db.update(categories)
      .set({ isPreset: true })
      .where(eq(categories.id, none.id))
      .run();
  }

  ensureAllHaveColors(db);

  if (!prefs) {
    db.insert(ownerPreferences)
      .values({
        id: 1,
        dueSoonDays: 7,
        theme: "console",
        timezone: "Asia/Shanghai",
        updatedAt: now,
      })
      .run();
  }
}
