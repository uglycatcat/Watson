import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { chatMessages, chatSessions, type PendingAction } from "../db/schema.js";
import type { AppConfig } from "../config/index.js";
import type { ScheduleCardDto } from "../types.js";
import { nowIso } from "../types.js";
import type { CategoryService } from "./category.service.js";
import type { ScheduleService } from "./schedule.service.js";
import { createLlmProvider } from "./llm/openai-compatible.js";
import type { ChatMessageInput } from "./llm/provider.js";
import { LLM_TOOLS, SYSTEM_PROMPT } from "./llm/tools/definitions.js";
import { executeTool } from "./llm/tools/handlers.js";

export class ChatService {
  constructor(
    private db: Db,
    private config: AppConfig,
    private scheduleService: ScheduleService,
    private categoryService: CategoryService,
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

    const offTopic = detectOffTopic(content);
    if (offTopic) {
      const reply = {
        id: randomUUID(),
        sessionId,
        role: "assistant" as const,
        content:
          "我是 Watson 日程助手，只能帮你管理日程。你可以问我「这周三有什么安排？」或说「明天下午三点开会」。",
        toolCalls: null,
        relatedCardId: null,
        createdAt: nowIso(),
      };
      this.db.insert(chatMessages).values(reply).run();
      return { message: formatMsg(reply), affectedCards: [], pendingConfirmation: false };
    }

    const provider = createLlmProvider(this.config)!;
    const history = this.getMessages(sessionId, 20);
    const messages: ChatMessageInput[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m: (typeof history)[number]) => ({
        role: m.role as ChatMessageInput["role"],
        content: m.content,
      })),
    ];

    const affectedCards: ScheduleCardDto[] = [];
    let pendingAction = parsePending(session.pendingAction);
    const ctx = {
      scheduleService: this.scheduleService,
      categoryService: this.categoryService,
      getPendingAction: () => pendingAction,
      setPendingAction: (a: PendingAction | null) => {
        pendingAction = a;
      },
      affectedCards,
    };

    let loops = 0;
    let finalContent = "";
    let pendingConfirmation = false;

    while (loops < 6) {
      loops++;
      const response = await provider.chat(messages, LLM_TOOLS);

      if (response.toolCalls.length === 0) {
        finalContent = response.content ?? "好的。";
        break;
      }

      messages.push({
        role: "assistant",
        content: response.content ?? "",
      });

      for (const tc of response.toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }
        const result = executeTool(tc.name, args, ctx);
        if (tc.name === "request_delete_card") pendingConfirmation = true;
        if (tc.name === "confirm_delete_card" && !(result as { error?: string }).error) {
          pendingConfirmation = false;
        }
        const resultStr = JSON.stringify(result);
        messages.push({
          role: "tool",
          content: resultStr,
          tool_call_id: tc.id,
          name: tc.name,
        });
      }
    }

    if (!finalContent) {
      const last = await provider.chat(messages);
      finalContent = last.content ?? "操作已完成。";
    }

    this.db
      .update(chatSessions)
      .set({
        pendingAction: pendingAction ? JSON.stringify(pendingAction) : null,
        updatedAt: nowIso(),
      })
      .where(eq(chatSessions.id, sessionId))
      .run();

    const assistantMsg = {
      id: randomUUID(),
      sessionId,
      role: "assistant" as const,
      content: finalContent,
      toolCalls: null,
      relatedCardId: affectedCards[0]?.id ?? null,
      createdAt: nowIso(),
    };
    this.db.insert(chatMessages).values(assistantMsg).run();

    return {
      message: formatMsg(assistantMsg),
      affectedCards,
      pendingConfirmation,
    };
  }
}

function parsePending(raw: string | null): PendingAction | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
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

function detectOffTopic(content: string): boolean {
  const scheduleHints =
    /日程|安排|会议|预约|deadline|截止|体检|周会|删除|取消|修改|添加|创建|查询|明天|后天|下周|上午|下午|点|号/i;
  if (scheduleHints.test(content)) return false;
  if (content.length < 8) return false;
  const chitChat = /天气|新闻|笑话|你是谁|写代码|翻译/i;
  return chitChat.test(content);
}
