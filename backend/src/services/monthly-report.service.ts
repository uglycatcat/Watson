import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { monthlyReports } from "../db/schema.js";
import type { MonthlyReportDto } from "../types.js";
import { nowIso } from "../types.js";

export interface MonthlyReportSnapshot {
  goal: string;
  result: string;
  analysis: string;
}

export class MonthlyReportService {
  constructor(private db: Db) {}

  get(month: string): MonthlyReportDto | null {
    return (
      this.db.select().from(monthlyReports).where(eq(monthlyReports.month, month)).get() ?? null
    );
  }

  upsert(month: string, snapshot: MonthlyReportSnapshot): MonthlyReportDto {
    const now = nowIso();

    this.db
      .insert(monthlyReports)
      .values({
        month,
        goal: snapshot.goal,
        result: snapshot.result,
        analysis: snapshot.analysis,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: monthlyReports.month,
        set: {
          goal: snapshot.goal,
          result: snapshot.result,
          analysis: snapshot.analysis,
          updatedAt: now,
        },
      })
      .run();

    return this.get(month)!;
  }
}
