import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, ne } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { ownerPreferences, scheduleCards } from "../db/schema.js";
import type { CardKind, CardStage, CardStatus, ScheduleCardDto } from "../types.js";
import { isCardStage, nowIso, priorityScore } from "../types.js";
import type { CategoryService } from "./category.service.js";

export const CARD_KINDS = ["standard", "parent"] as const satisfies readonly CardKind[];

const SYSTEM_NONE_CATEGORY = "system-none";

type CardRow = typeof scheduleCards.$inferSelect;
type DbClient = Pick<Db, "select" | "insert" | "update" | "delete">;

export interface CreateCardInput {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  importance?: number;
  urgency?: number;
  categoryId?: string;
  categoryName?: string;
  stage?: CardStage;
}

export interface ComposeInput {
  cardIds: string[];
  title: string;
  startAt?: string | null;
  endAt?: string | null;
}

export interface CardQueryFilters {
  view?: "day" | "week" | "month" | "all" | "trash";
  date?: string;
  categoryId?: string;
  importance?: number;
  urgency?: number;
  scheduled?: boolean;
  stage?: CardStage;
  sort?: "time" | "priority" | "title" | "createdAt";
}

interface DtoExtras {
  parentTitle?: string | null;
  childCount?: number;
  childCategories?: { id: string; name: string; color: string }[];
  timeManual?: boolean;
  lastParentTitle?: string | null;
  children?: ScheduleCardDto[] | null;
}

const STAGE_SORT_RANK: Record<CardStage, number> = {
  wrapping_up: 0,
  in_progress: 1,
  not_started: 2,
};

function sortChildrenByStageThenCreatedAtDesc<T extends { stage: CardStage; createdAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const stageDiff = STAGE_SORT_RANK[a.stage] - STAGE_SORT_RANK[b.stage];
    if (stageDiff !== 0) return stageDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
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

function envelopeFromRows(rows: CardRow[]): { startAt: string | null; endAt: string | null } {
  const scheduled = rows.filter((r) => r.startAt != null && r.endAt != null);
  if (scheduled.length === 0) return { startAt: null, endAt: null };

  let envStart = scheduled[0].startAt!;
  let envEnd = scheduled[0].endAt!;
  for (const row of scheduled) {
    if (row.startAt! < envStart) envStart = row.startAt!;
    if (row.endAt! > envEnd) envEnd = row.endAt!;
  }
  return { startAt: envStart, endAt: envEnd };
}

function isNarrowerThanEnvelope(
  startAt: string | null,
  endAt: string | null,
  envelope: { startAt: string | null; endAt: string | null },
): boolean {
  if (envelope.startAt == null && envelope.endAt == null) return false;
  if (startAt == null || endAt == null) return true;
  if (envelope.startAt == null || envelope.endAt == null) return false;
  return new Date(startAt) > new Date(envelope.startAt) || new Date(endAt) < new Date(envelope.endAt);
}

function isWiderThanEnvelope(
  startAt: string | null,
  endAt: string | null,
  envelope: { startAt: string | null; endAt: string | null },
): boolean {
  if (startAt == null && endAt == null) return false;
  if (envelope.startAt == null && envelope.endAt == null) {
    return startAt != null || endAt != null;
  }
  if (startAt == null || endAt == null || envelope.startAt == null || envelope.endAt == null) {
    return false;
  }
  return new Date(startAt) < new Date(envelope.startAt) || new Date(endAt) > new Date(envelope.endAt);
}

export class ScheduleService {
  constructor(
    private db: Db,
    private categoryService: CategoryService,
  ) {}

  private toDto(
    row: CardRow,
    categoryName: string,
    categoryColor: string,
    extras: DtoExtras = {},
  ): ScheduleCardDto {
    const dto: ScheduleCardDto = {
      id: row.id,
      kind: row.kind as CardKind,
      title: row.title,
      description: row.description,
      startAt: row.startAt,
      endAt: row.endAt,
      importance: row.importance,
      urgency: row.urgency,
      categoryId: row.categoryId,
      categoryName,
      categoryColor,
      status: row.status as CardStatus,
      stage: row.stage,
      trashedAt: row.trashedAt,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    if (extras.parentTitle !== undefined) dto.parentTitle = extras.parentTitle;
    if (extras.childCount !== undefined) dto.childCount = extras.childCount;
    if (extras.childCategories !== undefined) dto.childCategories = extras.childCategories;
    if (row.kind === "parent") dto.timeManual = extras.timeManual ?? row.timeManual;
    if (extras.lastParentTitle !== undefined) dto.lastParentTitle = extras.lastParentTitle;
    if (extras.children !== undefined) dto.children = extras.children;

    return dto;
  }

  private listChildCategories(
    parentId: string,
    db: DbClient = this.db,
  ): { id: string; name: string; color: string }[] {
    const children = db
      .select()
      .from(scheduleCards)
      .where(
        and(
          eq(scheduleCards.parentId, parentId),
          eq(scheduleCards.status, "active"),
          eq(scheduleCards.kind, "standard"),
        ),
      )
      .all();
    const seen = new Set<string>();
    const out: { id: string; name: string; color: string }[] = [];
    for (const child of children) {
      if (seen.has(child.categoryId)) continue;
      seen.add(child.categoryId);
      const cat = this.categoryService.findById(child.categoryId);
      out.push({
        id: child.categoryId,
        name: cat?.name ?? "未知",
        color: cat?.color ?? "#90A4AE",
      });
    }
    return out;
  }

  private parentListExtras(parentId: string, timeManual: boolean, db: DbClient = this.db): DtoExtras {
    return {
      childCount: this.countActiveChildren(parentId, db),
      childCategories: this.listChildCategories(parentId, db),
      timeManual,
    };
  }

  private joinCategory(row: CardRow, extras: DtoExtras = {}): ScheduleCardDto {
    const cat = this.categoryService.findById(row.categoryId);
    return this.toDto(row, cat?.name ?? "未知", cat?.color ?? "#90A4AE", extras);
  }

  private assertTitleUnique(titleLower: string, excludeId?: string, db: DbClient = this.db) {
    const existing = db
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

  private uniqueTitleWithUnderscore(baseTitle: string, db: DbClient = this.db): {
    title: string;
    titleLower: string;
  } {
    let { title, titleLower } = normalizeTitle(baseTitle);
    while (true) {
      const conflict = db
        .select({ id: scheduleCards.id })
        .from(scheduleCards)
        .where(and(eq(scheduleCards.titleLower, titleLower), eq(scheduleCards.status, "active")))
        .get();
      if (!conflict) return { title, titleLower };
      title = `_${title}`;
      titleLower = normalizeTitle(title).titleLower;
    }
  }

  private getRow(id: string, db: DbClient = this.db): CardRow | undefined {
    return db.select().from(scheduleCards).where(eq(scheduleCards.id, id)).get();
  }

  private assertActiveStandardIndependent(row: CardRow, label = "Card") {
    if (row.kind !== "standard") {
      throw Object.assign(new Error(`${label} must be a standard card`), { statusCode: 400 });
    }
    if (row.status !== "active") {
      throw Object.assign(new Error(`${label} is not active`), { statusCode: 400 });
    }
    if (row.parentId != null) {
      throw Object.assign(new Error(`${label} must be independent`), { statusCode: 400 });
    }
  }

  private assertActiveParent(row: CardRow, label = "Parent") {
    if (row.kind !== "parent") {
      throw Object.assign(new Error(`${label} must be a parent card`), { statusCode: 404 });
    }
    if (row.status !== "active") {
      throw Object.assign(new Error(`${label} is not active`), { statusCode: 400 });
    }
  }

  private computeEnvelope(parentId: string, db: DbClient = this.db): {
    startAt: string | null;
    endAt: string | null;
  } {
    const children = db
      .select()
      .from(scheduleCards)
      .where(
        and(
          eq(scheduleCards.parentId, parentId),
          eq(scheduleCards.status, "active"),
          eq(scheduleCards.kind, "standard"),
        ),
      )
      .all();
    return envelopeFromRows(children);
  }

  countActiveChildren(parentId: string, db: DbClient = this.db): number {
    return db
      .select()
      .from(scheduleCards)
      .where(
        and(
          eq(scheduleCards.parentId, parentId),
          eq(scheduleCards.status, "active"),
          eq(scheduleCards.kind, "standard"),
        ),
      )
      .all().length;
  }

  recomputeParentTime(parentId: string, db: DbClient = this.db): void {
    const parent = this.getRow(parentId, db);
    if (!parent || parent.kind !== "parent") return;

    const envelope = this.computeEnvelope(parentId, db);
    const now = nowIso();

    if (envelope.startAt == null && envelope.endAt == null) {
      db.update(scheduleCards)
        .set({ startAt: null, endAt: null, timeManual: false, updatedAt: now })
        .where(eq(scheduleCards.id, parentId))
        .run();
      return;
    }

    if (!parent.timeManual) {
      db.update(scheduleCards)
        .set({ startAt: envelope.startAt, endAt: envelope.endAt, updatedAt: now })
        .where(eq(scheduleCards.id, parentId))
        .run();
      return;
    }

    let startAt = parent.startAt;
    let endAt = parent.endAt;
    if (!startAt || new Date(startAt) > new Date(envelope.startAt!)) {
      startAt = envelope.startAt;
    }
    if (!endAt || new Date(endAt) < new Date(envelope.endAt!)) {
      endAt = envelope.endAt;
    }

    db.update(scheduleCards)
      .set({ startAt, endAt, updatedAt: now })
      .where(eq(scheduleCards.id, parentId))
      .run();
  }

  hardDeleteParentIfEmpty(parentId: string, db: DbClient = this.db): void {
    if (this.countActiveChildren(parentId, db) === 0) {
      db.delete(scheduleCards)
        .where(and(eq(scheduleCards.id, parentId), eq(scheduleCards.kind, "parent")))
        .run();
    }
  }

  private resolveOrCreateParent(titleSnapshot: string, db: DbClient = this.db): string {
    const normalized = normalizeTitle(titleSnapshot);
    const existing = db
      .select()
      .from(scheduleCards)
      .where(
        and(
          eq(scheduleCards.kind, "parent"),
          eq(scheduleCards.status, "active"),
          eq(scheduleCards.titleLower, normalized.titleLower),
        ),
      )
      .get();
    if (existing) return existing.id;

    const { title, titleLower } = this.uniqueTitleWithUnderscore(titleSnapshot, db);
    const now = nowIso();
    const id = randomUUID();
    db.insert(scheduleCards)
      .values({
        id,
        kind: "parent",
        title,
        titleLower,
        description: null,
        timeNature: null,
        startAt: null,
        endAt: null,
        deadlineAt: null,
        importance: 5,
        urgency: 5,
        categoryId: SYSTEM_NONE_CATEGORY,
        status: "active",
        stage: "not_started",
        parentId: null,
        timeManual: false,
        lastParentTitle: null,
        trashedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return id;
  }

  private resolveParentTimesForCompose(
    envelope: { startAt: string | null; endAt: string | null },
    startAt?: string | null,
    endAt?: string | null,
  ): { startAt: string | null; endAt: string | null; timeManual: boolean } {
    const timesProvided = startAt !== undefined || endAt !== undefined;
    if (!timesProvided) {
      return { ...envelope, timeManual: false };
    }

    const resolved = resolveTime({ startAt: startAt ?? null, endAt: endAt ?? null });
    if (isNarrowerThanEnvelope(resolved.startAt, resolved.endAt, envelope)) {
      throw Object.assign(new Error("Parent time must not be narrower than child envelope"), {
        statusCode: 400,
      });
    }

    const timeManual = isWiderThanEnvelope(resolved.startAt, resolved.endAt, envelope);
    if (timeManual) {
      return { ...resolved, timeManual: true };
    }
    return { ...envelope, timeManual: false };
  }

  getById(id: string): ScheduleCardDto | null {
    const row = this.getRow(id);
    if (!row) return null;

    if (row.kind === "parent") {
      const children = sortChildrenByStageThenCreatedAtDesc(
        this.db
          .select()
          .from(scheduleCards)
          .where(and(eq(scheduleCards.parentId, id), eq(scheduleCards.status, "active")))
          .all(),
      );
      return this.joinCategory(row, {
        childCount: children.length,
        childCategories: this.listChildCategories(id),
        timeManual: row.timeManual,
        children: children.map((c) => this.joinCategory(c)),
      });
    }

    let parentTitle: string | null = null;
    if (row.parentId) {
      const parent = this.getRow(row.parentId);
      parentTitle = parent?.title ?? null;
    }
    return this.joinCategory(row, { parentTitle });
  }

  create(input: CreateCardInput): ScheduleCardDto {
    const { title, titleLower } = normalizeTitle(input.title);
    if (!title) throw Object.assign(new Error("title required"), { statusCode: 400 });
    this.assertTitleUnique(titleLower);

    let categoryId = input.categoryId;
    if (!categoryId) {
      const cat = input.categoryName
        ? this.categoryService.findOrCreate(input.categoryName)
        : this.categoryService.resolveDefault();
      categoryId = cat.id;
    }
    if (input.stage !== undefined && !isCardStage(input.stage)) {
      throw Object.assign(new Error("Invalid stage"), { statusCode: 400 });
    }

    const now = nowIso();
    const times = resolveTime({ ...input, fallbackStartAt: now });

    const row: CardRow = {
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
      status: "active",
      stage: input.stage ?? "not_started",
      kind: "standard",
      parentId: null,
      timeManual: false,
      lastParentTitle: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(scheduleCards).values(row).run();
    return this.joinCategory(row);
  }

  compose(input: ComposeInput): ScheduleCardDto {
    if (!Array.isArray(input.cardIds) || input.cardIds.length !== 2) {
      throw Object.assign(new Error("cardIds must contain exactly two ids"), { statusCode: 400 });
    }
    const [idA, idB] = input.cardIds;
    if (idA === idB) {
      throw Object.assign(new Error("cardIds must be different"), { statusCode: 400 });
    }

    const { title, titleLower } = normalizeTitle(input.title);
    if (!title) throw Object.assign(new Error("title required"), { statusCode: 400 });

    return this.db.transaction((tx) => {
      const cardA = this.getRow(idA, tx);
      const cardB = this.getRow(idB, tx);
      if (!cardA || !cardB) {
        throw Object.assign(new Error("Card not found"), { statusCode: 404 });
      }
      this.assertActiveStandardIndependent(cardA, "Card A");
      this.assertActiveStandardIndependent(cardB, "Card B");
      this.assertTitleUnique(titleLower, undefined, tx);

      const envelope = envelopeFromRows([cardA, cardB]);
      const { startAt, endAt, timeManual } = this.resolveParentTimesForCompose(
        envelope,
        input.startAt,
        input.endAt,
      );

      const now = nowIso();
      const parentId = randomUUID();
      tx.insert(scheduleCards)
        .values({
          id: parentId,
          kind: "parent",
          title,
          titleLower,
          description: null,
          timeNature: null,
          startAt,
          endAt,
          deadlineAt: null,
          importance: 5,
          urgency: 5,
          categoryId: SYSTEM_NONE_CATEGORY,
          status: "active",
          stage: "not_started",
          parentId: null,
          timeManual,
          lastParentTitle: null,
          trashedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      for (const childId of [idA, idB]) {
        tx.update(scheduleCards)
          .set({ parentId, updatedAt: now })
          .where(eq(scheduleCards.id, childId))
          .run();
      }

      if (!timeManual) {
        this.recomputeParentTime(parentId, tx);
      }

      const parent = this.getRow(parentId, tx)!;
      return this.joinCategory(parent, this.parentListExtras(parentId, parent.timeManual, tx));
    });
  }

  addChild(parentId: string, cardId: string): ScheduleCardDto {
    return this.db.transaction((tx) => {
      const parent = this.getRow(parentId, tx);
      if (!parent) throw Object.assign(new Error("Parent not found"), { statusCode: 404 });
      this.assertActiveParent(parent);

      const child = this.getRow(cardId, tx);
      if (!child) throw Object.assign(new Error("Card not found"), { statusCode: 404 });
      this.assertActiveStandardIndependent(child);

      const now = nowIso();
      tx.update(scheduleCards)
        .set({ parentId, updatedAt: now })
        .where(eq(scheduleCards.id, cardId))
        .run();

      this.recomputeParentTime(parentId, tx);
      const updated = this.getRow(parentId, tx)!;
      return this.joinCategory(updated, this.parentListExtras(parentId, updated.timeManual, tx));
    });
  }

  mergeParents(targetId: string, sourceId: string): ScheduleCardDto {
    if (targetId === sourceId) {
      throw Object.assign(new Error("Cannot merge a parent into itself"), { statusCode: 400 });
    }

    return this.db.transaction((tx) => {
      const target = this.getRow(targetId, tx);
      const source = this.getRow(sourceId, tx);
      if (!target || !source) {
        throw Object.assign(new Error("Parent not found"), { statusCode: 404 });
      }
      this.assertActiveParent(target, "Target parent");
      this.assertActiveParent(source, "Source parent");

      const now = nowIso();
      tx.update(scheduleCards)
        .set({ parentId: targetId, updatedAt: now })
        .where(
          and(
            eq(scheduleCards.parentId, sourceId),
            eq(scheduleCards.status, "active"),
            eq(scheduleCards.kind, "standard"),
          ),
        )
        .run();

      tx.delete(scheduleCards)
        .where(and(eq(scheduleCards.id, sourceId), eq(scheduleCards.kind, "parent")))
        .run();

      this.recomputeParentTime(targetId, tx);
      const updated = this.getRow(targetId, tx)!;
      return this.joinCategory(updated, this.parentListExtras(targetId, updated.timeManual, tx));
    });
  }

  detachChild(cardId: string): ScheduleCardDto {
    return this.db.transaction((tx) => {
      const child = this.getRow(cardId, tx);
      if (!child) throw Object.assign(new Error("Card not found"), { statusCode: 404 });
      if (child.kind !== "standard" || child.status !== "active") {
        throw Object.assign(new Error("Card must be an active standard card"), { statusCode: 400 });
      }
      if (child.parentId == null) {
        throw Object.assign(new Error("Card is not attached to a parent"), { statusCode: 400 });
      }

      const oldParentId = child.parentId;
      const now = nowIso();
      tx.update(scheduleCards)
        .set({ parentId: null, updatedAt: now })
        .where(eq(scheduleCards.id, cardId))
        .run();

      this.recomputeParentTime(oldParentId, tx);
      this.hardDeleteParentIfEmpty(oldParentId, tx);

      const updated = this.getRow(cardId, tx)!;
      return this.joinCategory(updated);
    });
  }

  update(id: string, patch: Partial<CreateCardInput>): ScheduleCardDto | null {
    const existing = this.getRow(id);
    if (!existing) return null;
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    if (existing.kind === "parent") {
      return this.updateParent(id, existing, patch);
    }

    return this.updateStandard(id, existing, patch);
  }

  private updateParent(id: string, existing: CardRow, patch: Partial<CreateCardInput>): ScheduleCardDto {
    const disallowed: (keyof CreateCardInput)[] = [
      "description",
      "importance",
      "urgency",
      "categoryId",
      "categoryName",
      "stage",
    ];
    for (const field of disallowed) {
      if (patch[field] !== undefined) {
        throw Object.assign(new Error(`Cannot update ${field} on parent card`), { statusCode: 400 });
      }
    }

    const titlePatch = patch.title !== undefined ? normalizeTitle(patch.title) : null;
    if (titlePatch) {
      if (!titlePatch.title) throw Object.assign(new Error("title required"), { statusCode: 400 });
      if (titlePatch.titleLower !== existing.titleLower) {
        this.assertTitleUnique(titlePatch.titleLower, id);
      }
    }

    const timeTouched = patch.startAt !== undefined || patch.endAt !== undefined;
    let startAt = existing.startAt;
    let endAt = existing.endAt;
    let timeManual = existing.timeManual;

    if (timeTouched) {
      const envelope = this.computeEnvelope(id);
      const resolved = resolveTime({
        startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
        endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
        fallbackStartAt: existing.createdAt,
      });

      if (resolved.startAt == null && resolved.endAt == null) {
        if (envelope.startAt != null || envelope.endAt != null) {
          throw Object.assign(new Error("Cannot clear parent time while children are scheduled"), {
            statusCode: 400,
          });
        }
        startAt = null;
        endAt = null;
        timeManual = false;
      } else {
        if (isNarrowerThanEnvelope(resolved.startAt, resolved.endAt, envelope)) {
          throw Object.assign(new Error("Parent time must not be narrower than child envelope"), {
            statusCode: 400,
          });
        }
        startAt = resolved.startAt;
        endAt = resolved.endAt;
        timeManual = true;
      }
    }

    const now = nowIso();
    this.db
      .update(scheduleCards)
      .set({
        title: titlePatch?.title ?? existing.title,
        titleLower: titlePatch?.titleLower ?? existing.titleLower,
        startAt,
        endAt,
        timeManual,
        updatedAt: now,
      })
      .where(eq(scheduleCards.id, id))
      .run();

    return this.getById(id)!;
  }

  private updateStandard(
    id: string,
    existing: CardRow,
    patch: Partial<CreateCardInput>,
  ): ScheduleCardDto {
    if (patch.stage !== undefined && !isCardStage(patch.stage)) {
      throw Object.assign(new Error("Invalid stage"), { statusCode: 400 });
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

    const timeChanged = patch.startAt !== undefined || patch.endAt !== undefined;
    const times = resolveTime({
      startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
      endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
      fallbackStartAt: existing.createdAt,
    });

    const parentId = existing.parentId;
    const now = nowIso();
    this.db
      .update(scheduleCards)
      .set({
        title: titlePatch?.title ?? existing.title,
        titleLower: titlePatch?.titleLower ?? existing.titleLower,
        description: patch.description !== undefined ? patch.description : existing.description,
        startAt: times.startAt,
        endAt: times.endAt,
        importance: patch.importance !== undefined ? clampPriority(patch.importance) : existing.importance,
        urgency: patch.urgency !== undefined ? clampPriority(patch.urgency) : existing.urgency,
        categoryId,
        stage: patch.stage ?? existing.stage,
        updatedAt: now,
      })
      .where(eq(scheduleCards.id, id))
      .run();

    if (parentId && timeChanged) {
      this.recomputeParentTime(parentId);
      this.hardDeleteParentIfEmpty(parentId);
    }

    return this.getById(id)!;
  }

  complete(id: string): ScheduleCardDto | null {
    const existing = this.getRow(id);
    if (!existing) return null;
    if (existing.kind === "parent") {
      throw Object.assign(new Error("Parent cards cannot be completed"), { statusCode: 400 });
    }
    if (existing.status === "completed") return this.joinCategory(existing);
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    return this.softTrashStandard(existing, "completed");
  }

  delete(id: string): ScheduleCardDto | null {
    const existing = this.getRow(id);
    if (!existing) return null;
    if (existing.kind === "parent") {
      throw Object.assign(new Error("Parent cards cannot be deleted"), { statusCode: 400 });
    }
    if (existing.status === "deleted") return this.joinCategory(existing);
    if (existing.status !== "active") {
      throw Object.assign(new Error("Card is not active"), { statusCode: 409 });
    }

    return this.softTrashStandard(existing, "deleted");
  }

  private softTrashStandard(
    existing: CardRow,
    status: "completed" | "deleted",
  ): ScheduleCardDto {
    const parentId = existing.parentId;
    let lastParentTitle: string | null = existing.lastParentTitle;
    if (parentId) {
      const parent = this.getRow(parentId);
      lastParentTitle = parent?.title ?? null;
    }

    return this.db.transaction((tx) => {
      const now = nowIso();
      tx.update(scheduleCards)
        .set({
          status,
          trashedAt: now,
          parentId: null,
          lastParentTitle,
          updatedAt: now,
        })
        .where(eq(scheduleCards.id, existing.id))
        .run();

      if (parentId) {
        this.recomputeParentTime(parentId, tx);
        this.hardDeleteParentIfEmpty(parentId, tx);
      }

      const updated = this.getRow(existing.id, tx)!;
      return this.joinCategory(updated, { lastParentTitle: updated.lastParentTitle });
    });
  }

  restore(id: string): ScheduleCardDto | null {
    const existing = this.getRow(id);
    if (!existing) return null;
    if (existing.kind === "parent") {
      throw Object.assign(new Error("Parent cards cannot be restored"), { statusCode: 400 });
    }
    if (existing.status === "active") return this.joinCategory(existing);
    if (existing.status !== "completed" && existing.status !== "deleted") {
      throw Object.assign(new Error("Card cannot be restored"), { statusCode: 409 });
    }

    return this.db.transaction((tx) => {
      const { title, titleLower } = this.uniqueTitleWithUnderscore(existing.title, tx);
      let parentId: string | null = null;
      if (existing.lastParentTitle) {
        parentId = this.resolveOrCreateParent(existing.lastParentTitle, tx);
      }

      const now = nowIso();
      tx.update(scheduleCards)
        .set({
          status: "active",
          trashedAt: null,
          title,
          titleLower,
          parentId,
          lastParentTitle: null,
          updatedAt: now,
        })
        .where(eq(scheduleCards.id, id))
        .run();

      if (parentId) {
        this.recomputeParentTime(parentId, tx);
      }

      const updated = this.getRow(id, tx)!;
      let parentTitle: string | null = null;
      if (updated.parentId) {
        parentTitle = this.getRow(updated.parentId, tx)?.title ?? null;
      }
      return this.joinCategory(updated, { parentTitle });
    });
  }

  permanentDelete(id: string): boolean {
    const existing = this.getRow(id);
    if (!existing) return false;
    if (existing.kind === "parent") {
      throw Object.assign(new Error("Parent cards cannot be permanently deleted"), { statusCode: 400 });
    }
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
    const view = filters.view ?? "all";

    if (view === "trash") {
      rows = rows.filter(
        (r) => r.kind === "standard" && (r.status === "completed" || r.status === "deleted"),
      );
      const dtos = rows.map((r) =>
        this.joinCategory(r, { lastParentTitle: r.lastParentTitle }),
      );
      return dtos.sort((a, b) => (b.trashedAt ?? "").localeCompare(a.trashedAt ?? ""));
    }

    rows = rows.filter((r) => r.status === "active");

    if (view === "day") {
      // All active standards (including parent members). Optional date limits range.
      rows = rows.filter((r) => r.kind === "standard");
      if (filters.date) {
        const { start, end } = rangeForView("day", filters.date);
        rows = rows.filter((r) => cardInRange(r, start, end));
      }
    } else {
      rows = rows.filter((r) => r.kind === "parent" || (r.kind === "standard" && r.parentId == null));
      if (filters.date && view !== "all") {
        const { start, end } = rangeForView(view, filters.date);
        rows = rows.filter((r) => cardInRange(r, start, end));
      }
    }

    // Day (incl. undated "all standards" for AllView quadrant): filters apply to every standard.
    // All/week/month: category/stage/priority filters only hit independent standards; parents stay.
    if (view === "day") {
      if (filters.categoryId) rows = rows.filter((r) => r.categoryId === filters.categoryId);
      if (filters.importance != null) rows = rows.filter((r) => r.importance === filters.importance);
      if (filters.urgency != null) rows = rows.filter((r) => r.urgency === filters.urgency);
      if (filters.stage) rows = rows.filter((r) => r.stage === filters.stage);
    } else {
      if (filters.categoryId) {
        rows = rows.filter(
          (r) =>
            r.kind === "parent" ||
            (r.kind === "standard" && r.parentId == null && r.categoryId === filters.categoryId),
        );
      }
      if (filters.importance != null) {
        rows = rows.filter(
          (r) =>
            r.kind === "parent" ||
            (r.kind === "standard" && r.parentId == null && r.importance === filters.importance),
        );
      }
      if (filters.urgency != null) {
        rows = rows.filter(
          (r) =>
            r.kind === "parent" ||
            (r.kind === "standard" && r.parentId == null && r.urgency === filters.urgency),
        );
      }
      if (filters.stage && view === "all") {
        rows = rows.filter(
          (r) =>
            r.kind === "parent" ||
            (r.kind === "standard" && r.parentId == null && r.stage === filters.stage),
        );
      }
    }
    if (filters.scheduled === true) {
      rows = rows.filter((r) => r.startAt != null && r.endAt != null);
    }
    if (filters.scheduled === false) {
      rows = rows.filter((r) => r.startAt == null && r.endAt == null);
    }

    const parentTitleById = new Map<string, string>();
    if (view === "day") {
      const parentIds = [...new Set(rows.map((r) => r.parentId).filter(Boolean))] as string[];
      for (const pid of parentIds) {
        const parent = this.getRow(pid);
        if (parent) parentTitleById.set(pid, parent.title);
      }
    }

    const dtos = rows.map((r) => {
      if (r.kind === "parent") {
        return this.joinCategory(r, this.parentListExtras(r.id, r.timeManual));
      }
      const extras: DtoExtras = {};
      if (r.parentId) {
        extras.parentTitle = parentTitleById.get(r.parentId) ?? null;
      }
      return this.joinCategory(r, extras);
    });

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

function cardInRange(row: CardRow, start: Date, end: Date): boolean {
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
