import { eq, gte } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { categories, ownerPreferences } from "../db/schema.js";
import type { CategoryService } from "./category.service.js";
import type { ScheduleService } from "./schedule.service.js";
import { nowIso } from "../types.js";

export class SyncService {
  constructor(
    private db: Db,
    private scheduleService: ScheduleService,
    private categoryService: CategoryService,
  ) {}

  sync(since?: string) {
    const serverTime = nowIso();
    const cards = since ? this.scheduleService.updatedSince(since) : this.scheduleService.listAll();

    let preferences = null;
    let categoriesChanged = null;

    if (since) {
      const prefs = this.db
        .select()
        .from(ownerPreferences)
        .where(gte(ownerPreferences.updatedAt, since))
        .get();
      if (prefs) {
        preferences = {
          dueSoonDays: prefs.dueSoonDays,
          theme: prefs.theme,
          timezone: prefs.timezone,
          updatedAt: prefs.updatedAt,
        };
      }
      categoriesChanged = this.db
        .select()
        .from(categories)
        .where(gte(categories.createdAt, since))
        .all()
        .map((c) => ({ id: c.id, name: c.name, isPreset: c.isPreset }));
    } else {
      const prefs = this.db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
      if (prefs) {
        preferences = {
          dueSoonDays: prefs.dueSoonDays,
          theme: prefs.theme,
          timezone: prefs.timezone,
          updatedAt: prefs.updatedAt,
        };
      }
      categoriesChanged = this.categoryService.list().map((c) => ({
        id: c.id,
        name: c.name,
        isPreset: c.isPreset,
      }));
    }

    return { serverTime, cards, preferences, categories: categoriesChanged };
  }
}
