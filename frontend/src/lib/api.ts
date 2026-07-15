export type CardStatus = "active" | "completed" | "deleted";

export interface ScheduleCard {
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

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  relatedCardId: string | null;
  createdAt: string;
}

export interface OwnerPreferences {
  dueSoonDays: number;
  theme: "light" | "dark" | "system";
  timezone: string;
  updatedAt: string;
}

export interface ScheduleCardInput {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  importance?: number;
  urgency?: number;
  categoryId?: string;
  categoryName?: string;
}

export type CardSort = "time" | "priority" | "title" | "createdAt";

export interface CardQueryParams {
  view?: "day" | "week" | "month" | "all" | "trash";
  date?: string;
  categoryId?: string;
  importance?: string | number;
  urgency?: string | number;
  scheduled?: "true" | "false";
  sort?: CardSort;
}

export function priorityScore(importance: number, urgency: number): number {
  return importance * 11 + urgency;
}

export function isScheduled(card: ScheduleCard): boolean {
  return card.startAt != null;
}

export function isTrashed(card: ScheduleCard): boolean {
  return card.status === "completed" || card.status === "deleted";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body != null && init.body !== "";
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  login: (code: string) =>
    request<{ authenticated: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ authenticated: boolean }>("/api/auth/me"),
  getCards: (params?: CardQueryParams | Record<string, string>) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ items: ScheduleCard[] }>(`/api/cards${q ? `?${q}` : ""}`);
  },
  getCardById: (id: string) => request<ScheduleCard>(`/api/cards/${id}`),
  createCard: (body: ScheduleCardInput) =>
    request<ScheduleCard>("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  updateCard: (id: string, body: Partial<ScheduleCardInput>) =>
    request<ScheduleCard>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCard: (id: string) => request<ScheduleCard>(`/api/cards/${id}`, { method: "DELETE" }),
  completeCard: (id: string) => request<ScheduleCard>(`/api/cards/${id}/complete`, { method: "POST" }),
  restoreCard: (id: string) => request<ScheduleCard>(`/api/cards/${id}/restore`, { method: "POST" }),
  permanentDeleteCard: (id: string) => request<void>(`/api/cards/${id}/permanent`, { method: "DELETE" }),
  getCategories: () => request<{ items: { id: string; name: string; isPreset: boolean }[] }>("/api/categories"),
  getPreferences: () => request<OwnerPreferences>("/api/preferences"),
  patchPreferences: (body: Partial<OwnerPreferences>) =>
    request<OwnerPreferences>("/api/preferences", { method: "PATCH", body: JSON.stringify(body) }),
  sync: (since?: string) =>
    request<{
      serverTime: string;
      cards: ScheduleCard[];
      preferences: OwnerPreferences | null;
      categories: { id: string; name: string; isPreset: boolean }[] | null;
    }>(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`),
  createChatSession: () => request<{ id: string }>("/api/chat/sessions", { method: "POST" }),
  getChatMessages: (sessionId: string) =>
    request<{ items: ChatMessage[] }>(`/api/chat/sessions/${sessionId}/messages`),
  sendChatMessage: (sessionId: string, content: string) =>
    request<{ message: ChatMessage; affectedCards: ScheduleCard[]; pendingConfirmation: boolean }>(
      `/api/chat/sessions/${sessionId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),
};
