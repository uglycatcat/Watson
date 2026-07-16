import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, ne } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { categories, ownerPreferences, scheduleCards } from "../db/schema.js";
import type { CardStatus, ScheduleCardDto } from "../types.js";
import { nowIso, priorityScore } from "../types.js";
import type { CategoryService } from "./category.service.js";

export interface CreateCardInput {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  importance?: number;
  urgency?: number;
  categoryId?: string;
  categoryName?: string;
}

export interface CardQueryFilters {
  view?: "day" | "week" | "month" | "all" | "trash";
  date?: string;
  categoryId?: string;
  importance?: number;
  urgency?: number;
  scheduled?: boolean;
  sort?: "time" | "priority" | "title" | "createdAt";
}

function normalizeTitle(title: string): { title: string; titleLower: string } {
  const trimmed = title.trim();
  return { title: trimmed, titleLower: trimmed.toLowerCase() };
}

function clampPriority(value?: number): number {
  if (value == null || Number.isNaN(value)) return 5;
  return Math.round(Math.max(0, Math.min(10, value)));
}

function add24hIso(iso: string): string {
  return new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

/** Three mutually exclusive time states; `fallbackStartAt` used when only end is provided. */
function resolveTime(input: {
  startAt?: string | null;
  endAt?: string | null;
  fallbackStartAt?: string | null;
}): { startAt: string | null; endAt: string | null } {
  let startAt = input.startAt ?? null;
  let endAt = input.endAt ?? null;

  if (!startAt && !endAt) {
    return { startAt: null, endAt: null };
  }

  if (!startAt && endAt) {
    const fallback = input.fallbackStartAt ?? null;
    if (!fallback) {
      throw Object.assign(new Error("endAt requires startAt"), { statusCode: 400 });
    }
    startAt = fallback;
  }

  if (startAt && !endAt) {
    endAt = add24hIso(startAt);
  }

  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    throw Object.assign(new Error("endAt must be on or after startAt"), { statusCode: 400 });
  }

  return { startAt, endAt };
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
      startAt: row.startAt,
      endAt: row.endAt,
      importance: row.importance,
      urgency: row.urgency,
      categoryId: row.categoryId,
      categoryName,
      status: row.status as CardStatus,
      trashedAt: row.trashedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private joinCategory(row: typeof scheduleCards.$inferSelect): ScheduleCardDto {
    const cat = this.categoryService.findById(row.categoryId);
    return this.toDto(row, cat?.name ?? "未知");
  }

  private assertTitleUnique(titleLower: string, excludeId?: string) {
    const existing = this.db
      .select({ id: scheduleCards.id })
      .from(scheduleCards)
      .where(
        excludeId
          ? and(
              eq(scheduleCards.titleLower, titleLower),
              eq(scheduleCards.status, "active"),
              ne(scheduleCards.id, excludeId),
            )
          : and(eq(scheduleCards.titleLower, titleLower), eq(scheduleCards.status, "active")),
      )
      .get();
    if (existing) {
      throw Object.assign(new Error("Title already exists"), { statusCode: 409 });
    }
  }

  getById(id: string) {
    const row = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    return row ? this.joinCategory(row) : null;
  }

  create(input: CreateCardInput): ScheduleCardDto {
    const { title, titleLower } = normalizeTitle(input.title);
    if (!title) throw Object.assign(new Error("title required"), { statusCode: 400 });
    this.assertTitleUnique(titleLower);

    let categoryId = input.categoryId;
    if (!categoryId) {
      const cat = this.categoryService.findOrCreate(input.categoryName ?? "个人");
      categoryId = cat.id;
    }

    const now = nowIso();
    const times = resolveTime({ ...input, fallbackStartAt: now });

    const row = {
      id: randomUUID(),
      title,
      titleLower,
      description: input.description ?? null,
      timeNature: null,
      startAt: times.startAt,
      endAt: times.endAt,
      deadlineAt: null,
      importance: clampPriority(input.importance),
      urgency: clampPriority(input.urgency),
      categoryId,
      status: "active" as const,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(scheduleCards).values(row).run();
    return this.joinCategory(row);
  }

  update(id: string, patch: Partial<CreateCardInput>): ScheduleCardDto | null {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return null;
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    let categoryId = existing.categoryId;
    if (patch.categoryName) {
      categoryId = this.categoryService.findOrCreate(patch.categoryName).id;
    } else if (patch.categoryId) {
      categoryId = patch.categoryId;
    }

    const titlePatch = patch.title !== undefined ? normalizeTitle(patch.title) : null;
    if (titlePatch) {
      if (!titlePatch.title) throw Object.assign(new Error("title required"), { statusCode: 400 });
      if (titlePatch.titleLower !== existing.titleLower) {
        this.assertTitleUnique(titlePatch.titleLower, id);
      }
    }

    const times = resolveTime({
      startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
      endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
      fallbackStartAt: existing.createdAt,
    });

    const updated = {
      title: titlePatch?.title ?? existing.title,
      titleLower: titlePatch?.titleLower ?? existing.titleLower,
      description: patch.description !== undefined ? patch.description : existing.description,
      startAt: times.startAt,
      endAt: times.endAt,
      importance: patch.importance !== undefined ? clampPriority(patch.importance) : existing.importance,
      urgency: patch.urgency !== undefined ? clampPriority(patch.urgency) : existing.urgency,
      categoryId,
      updatedAt: nowIso(),
    };
    this.db.update(scheduleCards).set(updated).where(eq(scheduleCards.id, id)).run();
    return this.getById(id);
  }

  complete(id: string): ScheduleCardDto | null {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return null;
    if (existing.status === "completed") return this.joinCategory(existing);
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    const now = nowIso();
    this.db
      .update(scheduleCards)
      .set({ status: "completed", trashedAt: now, updatedAt: now })
      .where(eq(scheduleCards.id, id))
      .run();
    return this.getById(id);
  }

  delete(id: string): ScheduleCardDto | null {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return null;
    if (existing.status === "deleted") return this.joinCategory(existing);
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    const now = nowIso();
    this.db
      .update(scheduleCards)
      .set({ status: "deleted", trashedAt: now, updatedAt: now })
      .where(eq(scheduleCards.id, id))
      .run();
    return this.getById(id);
  }

  restore(id: string): ScheduleCardDto | null {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return null;
    if (existing.status === "active") return this.joinCategory(existing);
    if (existing.status !== "completed" && existing.status !== "deleted") {
      throw Object.assign(new Error("Card cannot be restored"), { statusCode: 409 });
    }

    this.assertTitleUnique(existing.titleLower);

    const now = nowIso();
    this.db
      .update(scheduleCards)
      .set({ status: "active", trashedAt: null, updatedAt: now })
      .where(eq(scheduleCards.id, id))
      .run();
    return this.getById(id);
  }

  permanentDelete(id: string): boolean {
    const existing = this.db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
    if (!existing) return false;
    if (existing.status !== "completed" && existing.status !== "deleted") {
      throw Object.assign(new Error("Only completed or deleted cards can be permanently deleted"), {
        statusCode: 409,
      });
    }
    const result = this.db.delete(scheduleCards).where(eq(scheduleCards.id, id)).run();
    return result.changes > 0;
  }

  listAll(filters: CardQueryFilters = {}): ScheduleCardDto[] {
    let rows = this.db.select().from(scheduleCards).all();

    if (filters.view === "trash") {
      rows = rows.filter((r) => r.status === "completed" || r.status === "deleted");
      const dtos = rows.map((r) => this.joinCategory(r));
      return dtos.sort((a, b) => (b.trashedAt ?? "").localeCompare(a.trashedAt ?? ""));
    }

    rows = rows.filter((r) => r.status === "active");

    if (filters.date && filters.view && filters.view !== "all") {
      const { start, end } = rangeForView(filters.view, filters.date);
      rows = rows.filter((r) => cardInRange(r, start, end));
    }
    if (filters.categoryId) rows = rows.filter((r) => r.categoryId === filters.categoryId);
    if (filters.importance != null) rows = rows.filter((r) => r.importance === filters.importance);
    if (filters.urgency != null) rows = rows.filter((r) => r.urgency === filters.urgency);
    if (filters.scheduled === true) rows = rows.filter((r) => r.startAt != null && r.endAt != null);
    if (filters.scheduled === false) rows = rows.filter((r) => r.startAt == null && r.endAt == null);

    const dtos = rows.map((r) => this.joinCategory(r));

    if (filters.sort === "priority") {
      return dtos.sort(
        (a, b) => priorityScore(b.importance, b.urgency) - priorityScore(a.importance, a.urgency),
      );
    }
    if (filters.sort === "title") {
      return dtos.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    }
    if (filters.sort === "createdAt") {
      return dtos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    if (filters.sort === "time") {
      const scheduled = dtos.filter((c) => c.startAt != null);
      const unscheduled = dtos.filter((c) => c.startAt == null);
      scheduled.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      unscheduled.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
      return [...scheduled, ...unscheduled];
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
      .filter((r) => r.status === "active")
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
      .filter((r) => r.status === "active")
      .filter((r) => cardInRange(r, start, end))
      .map((r) => this.joinCategory(r));
  }

  cardsDueSoon(): ScheduleCardDto[] {
    const prefs = this.db.select().from(ownerPreferences).where(eq(ownerPreferences.id, 1)).get();
    const days = prefs?.dueSoonDays ?? 7;
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + days);
    windowEnd.setHours(23, 59, 59, 999);

    return this.db
      .select()
      .from(scheduleCards)
      .all()
      .filter((r) => r.status === "active" && r.startAt != null)
      .filter((r) => {
        const s = new Date(r.startAt!);
        const e = r.endAt ? new Date(r.endAt) : s;
        return s <= windowEnd && e >= now;
      })
      .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""))
      .map((r) => this.joinCategory(r));
  }

  searchByTitle(query: string, limit = 5): ScheduleCardDto[] {
    const q = query.trim().toLowerCase();
    return this.db
      .select()
      .from(scheduleCards)
      .all()
      .filter((r) => r.status === "active")
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
  return c.startAt ?? c.updatedAt;
}

function cardInRange(row: typeof scheduleCards.$inferSelect, start: Date, end: Date): boolean {
  if (!row.startAt || !row.endAt) return false;
  const s = new Date(row.startAt);
  const e = new Date(row.endAt);
  return s <= end && e >= start;
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
