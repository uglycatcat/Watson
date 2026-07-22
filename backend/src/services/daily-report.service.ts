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
    const now = nowIso();

    // On conflict, only overwrite the fields actually provided in this request.
    // Fields left undefined keep their existing DB value, so this upsert is a
    // single atomic statement with no read-modify-write window (no lost updates
    // between concurrent writers touching different fields of the same date).
    const set: Record<string, unknown> = { updatedAt: now };
    if (snapshot.goal !== undefined) set.goal = snapshot.goal;
    if (snapshot.result !== undefined) set.result = snapshot.result;
    if (snapshot.analysis !== undefined) set.analysis = snapshot.analysis;

    this.db
      .insert(dailyReports)
      .values({
        date,
        goal: snapshot.goal ?? "",
        result: snapshot.result ?? "",
        analysis: snapshot.analysis ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyReports.date,
        set,
      })
      .run();

    return this.get(date)!;
  }
}
