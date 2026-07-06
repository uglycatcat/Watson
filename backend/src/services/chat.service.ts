import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { chatMessages, chatSessions } from "../db/schema.js";
import type { AppConfig } from "../config/index.js";
import { nowIso } from "../types.js";
import { createLlmProvider } from "./llm/openai-compatible.js";
import type { ChatMessageInput } from "./llm/provider.js";
import { SYSTEM_PROMPT } from "./llm/tools/definitions.js";

export class ChatService {
  constructor(
    private db: Db,
    private config: AppConfig,
  ) {}

  createSession() {
    const now = nowIso();
    const session = {
      id: randomUUID(),
      pendingAction: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(chatSessions).values(session).run();
    return { id: session.id, createdAt: session.createdAt };
  }

  getMessages(sessionId: string, limit = 50) {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit)
      .all();
  }

  async sendMessage(sessionId: string, content: string) {
    if (!this.config.llm.api_key) {
      throw Object.assign(new Error("LLM not configured"), { statusCode: 503 });
    }

    const session = this.db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
    if (!session) throw Object.assign(new Error("Session not found"), { statusCode: 404 });

    const userMsg = {
      id: randomUUID(),
      sessionId,
      role: "user" as const,
      content,
      toolCalls: null,
      relatedCardId: null,
      createdAt: nowIso(),
    };
    this.db.insert(chatMessages).values(userMsg).run();

    const provider = createLlmProvider(this.config)!;
    const history = this.getMessages(sessionId, 20);
    const messages: ChatMessageInput[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m: (typeof history)[number]) => ({
        role: m.role as ChatMessageInput["role"],
        content: m.content,
      })),
    ];

    const response = await provider.chat(messages);
    const finalContent = response.content ?? "好的。";

    this.db
      .update(chatSessions)
      .set({ pendingAction: null, updatedAt: nowIso() })
      .where(eq(chatSessions.id, sessionId))
      .run();

    const assistantMsg = {
      id: randomUUID(),
      sessionId,
      role: "assistant" as const,
      content: finalContent,
      toolCalls: null,
      relatedCardId: null,
      createdAt: nowIso(),
    };
    this.db.insert(chatMessages).values(assistantMsg).run();

    return {
      message: formatMsg(assistantMsg),
      affectedCards: [],
      pendingConfirmation: false,
    };
  }
}

function formatMsg(m: typeof chatMessages.$inferSelect) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    relatedCardId: m.relatedCardId,
    createdAt: m.createdAt,
  };
}
