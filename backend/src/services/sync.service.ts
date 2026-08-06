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

/** Stable fingerprint for category create/rename/delete detection without tombstones. */
export function categorySignature(
  cats: { id: string; name: string; isPreset: boolean; deletable: boolean }[],
): string {
  return cats
    .map((c) => `${c.id}:${c.name}:${c.isPreset ? 1 : 0}:${c.deletable ? 1 : 0}`)
    .sort()
    .join("|");
}

export interface SyncHints {
  cardCount?: number;
  cardMax?: string;
  catSig?: string;
}

export class SyncService {
  constructor(
    private db: Db,
    private scheduleService: ScheduleService,
    private categoryService: CategoryService,
  ) {}

  /**
   * @param since — omit for clock/meta alignment (no card dump). Pass ISO for incremental.
   * @param hints — client fingerprints; when they still match, return `{ unchanged: true }`.
   */
  sync(since?: string, hints?: SyncHints) {
    const serverTime = nowIso();
    const cardMeta = this.scheduleService.cardSyncMeta();
    const categories = this.categoryService.list().map(mapCategory);
    const catSig = categorySignature(categories);

    // Align-only: establish serverTime + fingerprints without shipping every card.
    if (!since) {
      const prefs = this.db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
      return {
        unchanged: false as const,
        serverTime,
        cards: [] as ReturnType<ScheduleService["listAll"]>,
        preferences: prefs ? mapPrefs(prefs) : null,
        categories,
        dailyReports: [] as (typeof dailyReports.$inferSelect)[],
        monthlyReports: [] as (typeof monthlyReports.$inferSelect)[],
        cardMeta,
        catSig,
      };
    }

    const prefsDirty = !!this.db
      .select()
      .from(ownerPreferences)
      .where(gt(ownerPreferences.updatedAt, since))
      .get();
    const dailyDirty = !!this.db
      .select({ date: dailyReports.date })
      .from(dailyReports)
      .where(gt(dailyReports.updatedAt, since))
      .get();
    const monthlyDirty = !!this.db
      .select({ month: monthlyReports.month })
      .from(monthlyReports)
      .where(gt(monthlyReports.updatedAt, since))
      .get();

    const metaMatch =
      hints?.cardCount != null &&
      Number.isFinite(hints.cardCount) &&
      hints.cardCount === cardMeta.count &&
      (hints.cardMax || "") === (cardMeta.maxUpdatedAt ?? "");
    const catMatch = !hints?.catSig || hints.catSig === catSig;

    // Matching cardMeta means no upserts and no permanent deletes since the client’s last sync.
    if (metaMatch && catMatch && !prefsDirty && !dailyDirty && !monthlyDirty) {
      return { unchanged: true as const, serverTime };
    }

    let preferences = null;
    if (prefsDirty) {
      const prefs = this.db
        .select()
        .from(ownerPreferences)
        .where(gt(ownerPreferences.updatedAt, since))
        .get();
      if (prefs) preferences = mapPrefs(prefs);
    }

    return {
      unchanged: false as const,
      serverTime,
      cards: this.scheduleService.updatedSince(since),
      preferences,
      categories,
      dailyReports: this.db.select().from(dailyReports).where(gt(dailyReports.updatedAt, since)).all(),
      monthlyReports: this.db
        .select()
        .from(monthlyReports)
        .where(gt(monthlyReports.updatedAt, since))
        .all(),
      cardMeta,
      catSig,
    };
  }
}
