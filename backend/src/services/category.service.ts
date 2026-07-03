import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { categories } from "../db/schema.js";
import { nowIso } from "../types.js";

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
}
