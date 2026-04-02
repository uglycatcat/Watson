import type { Schedule } from "../types/schedule";

export const STORAGE_KEY = "watson_schedules";

export function saveSchedules(data: Schedule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSchedules(): Schedule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSchedule);
  } catch {
    return [];
  }
}

function isSchedule(x: unknown): x is Schedule {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.date === "string" &&
    typeof o.startTime === "string" &&
    typeof o.endTime === "string" &&
    (o.priority === "low" || o.priority === "medium" || o.priority === "high")
  );
}
