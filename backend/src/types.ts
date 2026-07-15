export type CardStatus = "active" | "completed" | "deleted";

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
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function priorityScore(importance: number, urgency: number): number {
  return importance * 11 + urgency;
}

export function nowIso(): string {
  return new Date().toISOString();
}
