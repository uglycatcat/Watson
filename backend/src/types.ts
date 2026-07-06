export type PriorityLevel = "high" | "medium" | "low";
export type TimeNature = "duration" | "deadline";

export interface ScheduleCardDto {
  id: string;
  title: string;
  description: string | null;
  timeNature: TimeNature | null;
  startAt: string | null;
  endAt: string | null;
  deadlineAt: string | null;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export function priorityScore(importance: PriorityLevel, urgency: PriorityLevel): number {
  const w = { high: 3, medium: 2, low: 1 };
  return w[importance] * 3 + w[urgency];
}

export function nowIso(): string {
  return new Date().toISOString();
}
