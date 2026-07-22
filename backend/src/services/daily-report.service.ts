import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { dailyReports } from "../db/schema.js";
import type { DailyReportDto } from "../types.js";
import { nowIso } from "../types.js";

export interface DailyReportSnapshot {
  goal?: string;
  result?: string;
  analysis?: string;
}

export class DailyReportService {
  constructor(private db: Db) {}

  get(date: string): DailyReportDto | null {
    return (
      this.db.select().from(dailyReports).where(eq(dailyReports.date, date)).get() ?? null
    );
  }

  upsert(date: string, snapshot: DailyReportSnapshot): DailyReportDto {
    const existing = this.get(date);
    const merged = {
      goal: snapshot.goal ?? existing?.goal ?? "",
      result: snapshot.result ?? existing?.result ?? "",
      analysis: snapshot.analysis ?? existing?.analysis ?? "",
    };
    const now = nowIso();
    this.db
      .insert(dailyReports)
      .values({
        date,
        ...merged,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyReports.date,
        set: {
          ...merged,
          updatedAt: now,
        },
      })
      .run();

    return this.get(date)!;
  }
}
