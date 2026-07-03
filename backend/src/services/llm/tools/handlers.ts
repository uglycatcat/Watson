import type { PendingAction } from "../../../db/schema.js";
import type { CategoryService } from "../../category.service.js";
import type { ScheduleService } from "../../schedule.service.js";
import type { ScheduleCardDto } from "../../../types.js";

export interface ToolContext {
  scheduleService: ScheduleService;
  categoryService: CategoryService;
  getPendingAction: () => PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  affectedCards: ScheduleCardDto[];
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): unknown {
  switch (name) {
    case "create_card":
      return handleCreate(args, ctx);
    case "query_cards":
      return handleQuery(args, ctx);
    case "search_cards":
      return ctx.scheduleService.searchByTitle(String(args.query ?? ""), Number(args.limit ?? 5));
    case "update_card":
      return handleUpdate(args, ctx);
    case "request_delete_card":
      return handleRequestDelete(args, ctx);
    case "confirm_delete_card":
      return handleConfirmDelete(ctx);
    case "cancel_pending_action":
      ctx.setPendingAction(null);
      return { cancelled: true };
    case "add_category":
      return ctx.categoryService.create(String(args.name ?? ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function handleCreate(args: Record<string, unknown>, ctx: ToolContext) {
  const card = ctx.scheduleService.create({
    title: String(args.title),
    description: args.description ? String(args.description) : null,
    timeNature: args.timeNature as "duration" | "deadline",
    startAt: args.startAt ? String(args.startAt) : null,
    endAt: args.endAt ? String(args.endAt) : null,
    deadlineAt: args.deadlineAt ? String(args.deadlineAt) : null,
    importance: args.importance as "high" | "medium" | "low" | undefined,
    urgency: args.urgency as "high" | "medium" | "low" | undefined,
    categoryName: args.categoryName ? String(args.categoryName) : undefined,
  });
  ctx.affectedCards.push(card);
  return { card };
}

function handleQuery(args: Record<string, unknown>, ctx: ToolContext) {
  const mode = String(args.mode ?? "all");
  switch (mode) {
    case "on_date":
      return { items: ctx.scheduleService.cardsOnDate(String(args.date)) };
    case "in_range":
      return {
        items: ctx.scheduleService.cardsInRange(String(args.rangeStart), String(args.rangeEnd)),
      };
    case "due_soon":
      return { items: ctx.scheduleService.cardsDueSoon() };
    case "search":
      return { items: ctx.scheduleService.searchByTitle(String(args.searchQuery ?? "")) };
    default:
      return { items: ctx.scheduleService.listAll() };
  }
}

function handleUpdate(args: Record<string, unknown>, ctx: ToolContext) {
  const cardId = String(args.cardId);
  const updated = ctx.scheduleService.update(cardId, {
    title: args.title ? String(args.title) : undefined,
    startAt: args.startAt ? String(args.startAt) : undefined,
    endAt: args.endAt ? String(args.endAt) : undefined,
    deadlineAt: args.deadlineAt ? String(args.deadlineAt) : undefined,
    importance: args.importance as "high" | "medium" | "low" | undefined,
    urgency: args.urgency as "high" | "medium" | "low" | undefined,
    categoryName: args.categoryName ? String(args.categoryName) : undefined,
  });
  if (updated) ctx.affectedCards.push(updated);
  return { card: updated };
}

function handleRequestDelete(args: Record<string, unknown>, ctx: ToolContext) {
  const cardId = String(args.cardId);
  const card = ctx.scheduleService.getById(cardId);
  if (!card) return { error: "Card not found" };
  ctx.setPendingAction({
    type: "delete_confirm",
    cardId,
    cardTitle: card.title,
    askedAt: new Date().toISOString(),
  });
  return { pending: true, cardTitle: card.title, message: `确定删除「${card.title}」吗？` };
}

function handleConfirmDelete(ctx: ToolContext) {
  const pending = ctx.getPendingAction();
  if (!pending || pending.type !== "delete_confirm") {
    return { error: "no_pending_delete" };
  }
  const ok = ctx.scheduleService.delete(pending.cardId);
  ctx.setPendingAction(null);
  return { deleted: ok, cardId: pending.cardId };
}
