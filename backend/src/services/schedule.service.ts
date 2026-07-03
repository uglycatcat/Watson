import { randomUUID } from "node:crypto";
import { asc, eq, gte } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { categories, ownerPreferences, scheduleCards } from "../db/schema.js";
import type { PriorityLevel, ScheduleCardDto, TimeNature } from "../types.js";
import { nowIso, priorityScore } from "../types.js";
import type { CategoryService } from "./category.service.js";

export interface CreateCardInput {
  title: string;
  description?: string | null;
  timeNature: TimeNature;
  startAt?: string | null;
  endAt?: string | null;
  deadlineAt?: string | null;
  importance?: PriorityLevel;
  urgency?: PriorityLevel;
  categoryId?: string;
  categoryName?: string;
}

export interface CardQueryFilters {
  view?: "day" | "week" | "month" | "all";
  date?: string;
  categoryId?: string;
  importance?: PriorityLevel;
  urgency?: PriorityLevel;
  timeNature?: TimeNature;
  sort?: "time" | "priority";
}

export class ScheduleService {
  constructor(
    private db: Db,
    private categoryService: CategoryService,
  ) {}

  private toDto(row: typeof scheduleCards.$inferSelect, categoryName: string): ScheduleCardDto {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      timeNature: row.timeNature as TimeNature,
      startAt: row.startAt,
      endAt: row.endAt,
      deadlineAt: row.deadlineAt,
      importance: row.importance as PriorityLevel,
      urgency: row.urgency as PriorityLevel,
      categoryId: row.categoryId,
      categoryName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private joinCategory(row: typeof scheduleCards.$inferSelect): ScheduleCardDto {
    const cat = this.categoryService.findById(row.categoryId);
    return this.toDto(row, cat?.name ?? "未知");
  }

  getById(id: string) {
    const row = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    return row ? this.joinCategory(row) : null;
  }

  create(input: CreateCardInput): ScheduleCardDto {
    let categoryId = input.categoryId;
    if (!categoryId) {
      const cat = this.categoryService.findOrCreate(input.categoryName ?? "个人");
      categoryId = cat.id;
    }
    const now = nowIso();
    let startAt = input.startAt ?? null;
    let endAt = input.endAt ?? null;
    let deadlineAt = input.deadlineAt ?? null;

    if (input.timeNature === "duration") {
      if (!startAt) throw Object.assign(new Error("startAt required for duration"), { statusCode: 400 });
      if (!endAt) {
        endAt = new Date(new Date(startAt).getTime() + 3600_000).toISOString();
      }
      if (new Date(endAt) <= new Date(startAt)) {
        throw Object.assign(new Error("endAt must be after startAt"), { statusCode: 400 });
      }
      deadlineAt = null;
    } else {
      if (!deadlineAt) throw Object.assign(new Error("deadlineAt required"), { statusCode: 400 });
      startAt = null;
      endAt = null;
    }

    const row = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description ?? null,
      timeNature: input.timeNature,
      startAt,
      endAt,
      deadlineAt,
      importance: input.importance ?? "medium",
      urgency: input.urgency ?? "medium",
      categoryId,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(scheduleCards).values(row).run();
    return this.joinCategory(row);
  }

  update(id: string, patch: Partial<CreateCardInput>): ScheduleCardDto | null {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return null;

    let categoryId = existing.categoryId;
    if (patch.categoryName) {
      categoryId = this.categoryService.findOrCreate(patch.categoryName).id;
    } else if (patch.categoryId) {
      categoryId = patch.categoryId;
    }

    const timeNature = (patch.timeNature ?? existing.timeNature) as TimeNature;
    let startAt = patch.startAt !== undefined ? patch.startAt : existing.startAt;
    let endAt = patch.endAt !== undefined ? patch.endAt : existing.endAt;
    let deadlineAt = patch.deadlineAt !== undefined ? patch.deadlineAt : existing.deadlineAt;

    if (timeNature === "duration") {
      if (startAt && !endAt) endAt = new Date(new Date(startAt).getTime() + 3600_000).toISOString();
      if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
        throw Object.assign(new Error("endAt must be after startAt"), { statusCode: 400 });
      }
      deadlineAt = null;
    } else if (timeNature === "deadline") {
      startAt = null;
      endAt = null;
    }

    const updated = {
      title: patch.title?.trim() ?? existing.title,
      description: patch.description !== undefined ? patch.description : existing.description,
      timeNature,
      startAt,
      endAt,
      deadlineAt,
      importance: patch.importance ?? existing.importance,
      urgency: patch.urgency ?? existing.urgency,
      categoryId,
      updatedAt: nowIso(),
    };
    this.db.update(scheduleCards).set(updated).where(eq(scheduleCards.id, id)).run();
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(scheduleCards).where(eq(scheduleCards.id, id)).run();
    return result.changes > 0;
  }

  listAll(filters: CardQueryFilters = {}): ScheduleCardDto[] {
    let rows = this.db.select().from(scheduleCards).all();

    if (filters.date && filters.view && filters.view !== "all") {
      const { start, end } = rangeForView(filters.view, filters.date);
      rows = rows.filter((r) => cardInRange(r, start, end));
    }
    if (filters.categoryId) rows = rows.filter((r) => r.categoryId === filters.categoryId);
    if (filters.importance) rows = rows.filter((r) => r.importance === filters.importance);
    if (filters.urgency) rows = rows.filter((r) => r.urgency === filters.urgency);
    if (filters.timeNature) rows = rows.filter((r) => r.timeNature === filters.timeNature);

    const dtos = rows.map((r) => this.joinCategory(r));
    if (filters.sort === "priority") {
      return dtos.sort(
        (a, b) => priorityScore(b.importance, b.urgency) - priorityScore(a.importance, a.urgency),
      );
    }
    return dtos.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  cardsOnDate(dateStr: string): ScheduleCardDto[] {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(`${dateStr}T23:59:59.999`);
    return this.db
      .select()
      .from(scheduleCards)
      .all()
      .filter((r) => cardInRange(r, start, end))
      .map((r) => this.joinCategory(r));
  }

  cardsInRange(startStr: string, endStr: string): ScheduleCardDto[] {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return this.db
      .select()
      .from(scheduleCards)
      .all()
      .filter((r) => cardInRange(r, start, end))
      .map((r) => this.joinCategory(r));
  }

  cardsDueSoon(): ScheduleCardDto[] {
    const prefs = this.db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    const days = prefs?.dueSoonDays ?? 7;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    end.setHours(23, 59, 59, 999);

    return this.db
      .select()
      .from(scheduleCards)
      .where(eq(scheduleCards.timeNature, "deadline"))
      .all()
      .filter((r) => {
        if (!r.deadlineAt) return false;
        const d = new Date(r.deadlineAt);
        return d >= now && d <= end;
      })
      .sort((a, b) => (a.deadlineAt ?? "").localeCompare(b.deadlineAt ?? ""))
      .map((r) => this.joinCategory(r));
  }

  searchByTitle(query: string, limit = 5): ScheduleCardDto[] {
    const q = query.trim().toLowerCase();
    return this.db
      .select()
      .from(scheduleCards)
      .all()
      .filter((r) => r.title.toLowerCase().includes(q))
      .slice(0, limit)
      .map((r) => this.joinCategory(r));
  }

  updatedSince(since: string): ScheduleCardDto[] {
    return this.db
      .select()
      .from(scheduleCards)
      .where(gte(scheduleCards.updatedAt, since))
      .orderBy(asc(scheduleCards.updatedAt))
      .all()
      .map((r) => this.joinCategory(r));
  }
}

function sortKey(c: ScheduleCardDto): string {
  if (c.timeNature === "deadline") return c.deadlineAt ?? c.updatedAt;
  return c.startAt ?? c.updatedAt;
}

function cardInRange(row: typeof scheduleCards.$inferSelect, start: Date, end: Date): boolean {
  if (row.timeNature === "duration" && row.startAt) {
    const s = new Date(row.startAt);
    const e = row.endAt ? new Date(row.endAt) : s;
    return s <= end && e >= start;
  }
  if (row.timeNature === "deadline" && row.deadlineAt) {
    const d = new Date(row.deadlineAt);
    return d >= start && d <= end;
  }
  return false;
}

function rangeForView(view: "day" | "week" | "month", dateStr: string) {
  const d = new Date(dateStr);
  if (view === "day") {
    return {
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
    };
  }
  if (view === "week") {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
