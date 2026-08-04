import { eq, gt } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { dailyReports, monthlyReports, ownerPreferences } from "../db/schema.js";
import { persistTheme } from "../lib/theme.js";
import type { CategoryService } from "./category.service.js";
import type { ScheduleService } from "./schedule.service.js";
import { nowIso } from "../types.js";

function mapCategory(c: { id: string; name: string; nameLower: string; isPreset: boolean }) {
  return {
    id: c.id,
    name: c.name,
    isPreset: c.isPreset,
    deletable: c.nameLower !== "无",
  };
}

function mapPrefs(prefs: {
  dueSoonDays: number;
  theme: string;
  timezone: string;
  updatedAt: string;
}) {
  return {
    dueSoonDays: prefs.dueSoonDays,
    theme: persistTheme(prefs.theme) ?? "console",
    timezone: prefs.timezone,
    updatedAt: prefs.updatedAt,
  };
}

export class SyncService {
  constructor(
    private db: Db,
    private scheduleService: ScheduleService,
    private categoryService: CategoryService,
  ) {}

  /**
   * @param since — omit for clock/meta alignment (no card dump). Pass ISO for incremental.
   */
  sync(since?: string) {
    const serverTime = nowIso();
    const cardMeta = this.scheduleService.cardSyncMeta();
    const categories = this.categoryService.list().map(mapCategory);

    // Align-only: establish serverTime + fingerprints without shipping every card.
    if (!since) {
      const prefs = this.db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
      return {
        serverTime,
        cards: [] as ReturnType<ScheduleService["listAll"]>,
        preferences: prefs ? mapPrefs(prefs) : null,
        categories,
        dailyReports: [] as (typeof dailyReports.$inferSelect)[],
        monthlyReports: [] as (typeof monthlyReports.$inferSelect)[],
        cardMeta,
      };
    }

    const cards = this.scheduleService.updatedSince(since);

    let preferences = null;
    const prefs = this.db
      .select()
      .from(ownerPreferences)
      .where(gt(ownerPreferences.updatedAt, since))
      .get();
    if (prefs) preferences = mapPrefs(prefs);

    const dailyReportRows = this.db
      .select()
      .from(dailyReports)
      .where(gt(dailyReports.updatedAt, since))
      .all();
    const monthlyReportRows = this.db
      .select()
      .from(monthlyReports)
      .where(gt(monthlyReports.updatedAt, since))
      .all();

    return {
      serverTime,
      cards,
      preferences,
      categories,
      dailyReports: dailyReportRows,
      monthlyReports: monthlyReportRows,
      cardMeta,
    };
  }
}
