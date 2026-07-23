import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const CARD_STAGES = ["not_started", "in_progress", "wrapping_up"] as const;
export const CARD_KINDS = ["standard", "parent"] as const;

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  nameLower: text("name_lower").notNull().unique(),
  isPreset: integer("is_preset", { mode: "boolean" }).notNull().default(false),
  /** Left-edge accent on cards; from CATEGORY_COLOR_PALETTE. */
  color: text("color").notNull().default("#90A4AE"),
  createdAt: text("created_at").notNull(),
});

export const scheduleCards = sqliteTable(
  "schedule_cards",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    titleLower: text("title_lower").notNull(),
    description: text("description"),
    timeNature: text("time_nature"),
    startAt: text("start_at"),
    endAt: text("end_at"),
    deadlineAt: text("deadline_at"),
    importance: integer("importance").notNull().default(5),
    urgency: integer("urgency").notNull().default(5),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    status: text("status", { enum: ["active", "completed", "deleted"] })
      .notNull()
      .default("active"),
    stage: text("stage", { enum: CARD_STAGES }).notNull().default("not_started"),
    trashedAt: text("trashed_at"),
    kind: text("kind", { enum: CARD_KINDS }).notNull().default("standard"),
    parentId: text("parent_id"),
    timeManual: integer("time_manual", { mode: "boolean" }).notNull().default(false),
    lastParentTitle: text("last_parent_title"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_cards_start_at").on(t.startAt),
    index("idx_cards_deadline_at").on(t.deadlineAt),
    index("idx_cards_updated_at").on(t.updatedAt),
    index("idx_cards_category").on(t.categoryId),
    index("idx_cards_stage").on(t.stage),
    index("idx_cards_parent_id").on(t.parentId),
  ],
);

export const dailyReports = sqliteTable(
  "daily_reports",
  {
    date: text("date").primaryKey(),
    goal: text("goal").notNull().default(""),
    result: text("result").notNull().default(""),
    analysis: text("analysis").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_daily_reports_updated_at").on(t.updatedAt)],
);

export const ownerPreferences = sqliteTable("owner_preferences", {
  id: integer("id").primaryKey(),
  dueSoonDays: integer("due_soon_days").notNull().default(7),
  theme: text("theme", { enum: ["console", "spacex", "light", "dark", "system"] })
    .notNull()
    .default("console"),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  updatedAt: text("updated_at").notNull(),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  pendingAction: text("pending_action"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),
  relatedCardId: text("related_card_id"),
  createdAt: text("created_at").notNull(),
});

export type ScheduleCard = typeof scheduleCards.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type DailyReport = typeof dailyReports.$inferSelect;
export type OwnerPreference = typeof ownerPreferences.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type PendingAction =
  | {
      type: "delete_confirm";
      cardId: string;
      cardTitle: string;
      askedAt: string;
    }
  | {
      type: "disambiguate";
      operation: "update" | "delete";
      candidateCardIds: string[];
      askedAt: string;
    };
