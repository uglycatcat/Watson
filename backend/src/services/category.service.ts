import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { categories, scheduleCards } from "../db/schema.js";
import { allocateCategoryColor, isPaletteColor } from "../lib/categoryColors.js";
import { nowIso } from "../types.js";

const NONE_CATEGORY_NAME = "无";
const PERSONAL_CATEGORY_NAME = "个人";

export class CategoryService {
  constructor(private db: Db) {}

  list() {
    return this.db.select().from(categories).all();
  }

  findById(id: string) {
    return this.db.select().from(categories).where(eq(categories.id, id)).get();
  }

  findByNameCI(name: string) {
    const trimmed = name.trim();
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.nameLower, trimmed.toLowerCase()))
      .get();
  }

  findNone() {
    return this.findByNameCI(NONE_CATEGORY_NAME);
  }

  resolveDefault() {
    const category = this.findByNameCI(PERSONAL_CATEGORY_NAME) ?? this.findNone();
    if (!category) {
      throw Object.assign(new Error("Fallback category unavailable"), { statusCode: 409 });
    }
    return category;
  }

  private nextColor(): string {
    const used = this.db
      .select({ color: categories.color })
      .from(categories)
      .all()
      .map((r) => r.color);
    return allocateCategoryColor(used);
  }

  /** Assign palette colors to any category missing one or outside current palette. */
  ensureColors() {
    const rows = this.db.select().from(categories).all();
    const used = rows.map((r) => r.color).filter((c) => isPaletteColor(c));
    for (const row of rows) {
      if (isPaletteColor(row.color)) continue;
      const color = allocateCategoryColor(used);
      used.push(color);
      this.db.update(categories).set({ color }).where(eq(categories.id, row.id)).run();
    }
  }

  findOrCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 32) {
      throw Object.assign(new Error("Invalid category name"), { statusCode: 400 });
    }
    const existing = this.findByNameCI(trimmed);
    if (existing) return existing;
    const row = {
      id: randomUUID(),
      name: trimmed,
      nameLower: trimmed.toLowerCase(),
      isPreset: false,
      color: this.nextColor(),
      createdAt: nowIso(),
    };
    this.db.insert(categories).values(row).run();
    return row;
  }

  create(name: string) {
    const existing = this.findByNameCI(name);
    if (existing) {
      throw Object.assign(new Error("Category already exists"), { statusCode: 409 });
    }
    return this.findOrCreate(name);
  }

  delete(id: string): { reassignedCardCount: number } {
    return this.db.transaction((tx) => {
      const target = tx.select().from(categories).where(eq(categories.id, id)).get();
      if (!target) {
        throw Object.assign(new Error("Category not found"), { statusCode: 404 });
      }
      if (target.nameLower === NONE_CATEGORY_NAME) {
        throw Object.assign(new Error("Fallback category cannot be deleted"), { statusCode: 409 });
      }

      const none = tx
        .select()
        .from(categories)
        .where(eq(categories.nameLower, NONE_CATEGORY_NAME))
        .get();
      if (!none) {
        throw Object.assign(new Error("Fallback category unavailable"), { statusCode: 409 });
      }

      const reassigned = tx
        .update(scheduleCards)
        .set({ categoryId: none.id, updatedAt: nowIso() })
        .where(eq(scheduleCards.categoryId, target.id))
        .run();
      // Deleting the row releases its color for future allocations.
      tx.delete(categories).where(eq(categories.id, target.id)).run();

      return { reassignedCardCount: reassigned.changes };
    });
  }
}
