export type PriorityLevel = "high" | "medium" | "low";
export type TimeNature = "duration" | "deadline";

export interface ScheduleCard {
  id: string;
  title: string;
  description: string | null;
  timeNature: TimeNature;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  login: (token: string) =>
    request<{ authenticated: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ authenticated: boolean }>("/api/auth/me"),
  getCards: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: ScheduleCard[] }>(`/api/cards${q ? `?${q}` : ""}`);
  },
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
