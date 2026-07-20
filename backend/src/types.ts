export type CardStatus = "active" | "completed" | "deleted";
export const CARD_STAGES = ["not_started", "in_progress", "wrapping_up"] as const;
export type CardStage = (typeof CARD_STAGES)[number];

export function isCardStage(value: unknown): value is CardStage {
  return typeof value === "string" && CARD_STAGES.includes(value as CardStage);
}

export interface ScheduleCardDto {
  id: string;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  importance: number;
  urgency: number;
  categoryId: string;
  categoryName: string;
  status: CardStatus;
  stage: CardStage;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportDto {
  date: string;
  goal: string;
  result: string;
  analysis: string;
  createdAt: string;
  updatedAt: string;
}

export function priorityScore(importance: number, urgency: number): number {
  return importance * 11 + urgency;
}

export function nowIso(): string {
  return new Date().toISOString();
}
