export type CardStatus = "active" | "completed" | "deleted";
export type CardStage = "not_started" | "in_progress" | "wrapping_up";
export type CardKind = "standard" | "parent";

export interface DailyReport {
  date: string;
  goal: string;
  result: string;
  analysis: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  isPreset: boolean;
  deletable: boolean;
}

export interface ScheduleCard {
  id: string;
  kind?: CardKind;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  importance: number;
  urgency: number;
  categoryId: string;
  categoryName: string;
  /** Assigned category palette color; used only for card left-edge strip. */
  categoryColor: string;
  stage: CardStage;
  status: CardStatus;
  trashedAt: string | null;
  parentId?: string | null;
  parentTitle?: string | null;
  childCount?: number;
  /** Distinct categories of active children (parent cards only). */
  childCategories?: { id: string; name: string; color: string }[];
  timeManual?: boolean;
  lastParentTitle?: string | null;
  children?: ScheduleCard[] | null;
  createdAt: string;
  updatedAt: string;
}

export function cardKind(card: ScheduleCard): CardKind {
  return card.kind ?? "standard";
}

export function isParentCard(card: ScheduleCard): boolean {
  return cardKind(card) === "parent";
}

export function isIndependentStandard(card: ScheduleCard): boolean {
  return cardKind(card) === "standard" && card.status === "active" && !card.parentId;
}

export function envelopeFromCards(cards: ScheduleCard[]): { startAt: string | null; endAt: string | null } {
  const scheduled = cards.filter((c) => c.startAt != null && c.endAt != null);
  if (scheduled.length === 0) return { startAt: null, endAt: null };
  const starts = scheduled.map((c) => new Date(c.startAt!).getTime());
  const ends = scheduled.map((c) => new Date(c.endAt!).getTime());
  return {
    startAt: new Date(Math.min(...starts)).toISOString(),
    endAt: new Date(Math.max(...ends)).toISOString(),
  };
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
  theme: "console" | "spacex" | "light" | "dark" | "system";
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
  stage?: CardStage;
}

export type CardSort = "time" | "priority" | "title" | "createdAt";

export interface CardQueryParams {
  view?: "day" | "week" | "month" | "all" | "trash";
  date?: string;
  categoryId?: string;
  importance?: string | number;
  urgency?: string | number;
  scheduled?: "true" | "false";
  stage?: CardStage;
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
    const q = new URLSearchParams(
      Object.entries(params ?? {}).reduce<Record<string, string>>((result, [key, value]) => {
        if (value != null) result[key] = String(value);
        return result;
      }, {}),
    ).toString();
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
  composeParent: (body: {
    cardIds: [string, string];
    title: string;
    startAt?: string | null;
    endAt?: string | null;
  }) =>
    request<ScheduleCard>("/api/cards/compose", { method: "POST", body: JSON.stringify(body) }),
  addChildToParent: (parentId: string, cardId: string) =>
    request<ScheduleCard>(`/api/cards/${parentId}/children`, {
      method: "POST",
      body: JSON.stringify({ cardId }),
    }),
  mergeParents: (targetParentId: string, sourceParentId: string) =>
    request<ScheduleCard>(`/api/cards/${targetParentId}/merge`, {
      method: "POST",
      body: JSON.stringify({ sourceParentId }),
    }),
  detachChild: (cardId: string) =>
    request<ScheduleCard>(`/api/cards/${cardId}/detach`, { method: "POST" }),
  getCategories: () => request<{ items: Category[] }>("/api/categories"),
  createCategory: (name: string) =>
    request<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) =>
    request<void>(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getDailyReport: (date: string) =>
    request<{ item: DailyReport | null }>(`/api/daily-reports/${encodeURIComponent(date)}`),
  putDailyReport: (date: string, snapshot: Pick<DailyReport, "goal" | "result" | "analysis">) =>
    request<DailyReport>(`/api/daily-reports/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify(snapshot),
    }),
  getPreferences: () => request<OwnerPreferences>("/api/preferences"),
  patchPreferences: (body: Partial<OwnerPreferences>) =>
    request<OwnerPreferences>("/api/preferences", { method: "PATCH", body: JSON.stringify(body) }),
  sync: (since?: string) =>
    request<{
      serverTime: string;
      cards: ScheduleCard[];
      preferences: OwnerPreferences | null;
      categories: Category[] | null;
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
