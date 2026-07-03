import type { FastifyInstance } from "fastify";
import type { ChatService } from "../services/chat.service.js";

export async function chatRoutes(app: FastifyInstance, chatService: ChatService) {
  app.post("/api/chat/sessions", async (_request, reply) => {
    const session = chatService.createSession();
    return reply.status(201).send(session);
  });

  app.get("/api/chat/sessions/:sessionId/messages", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const items = chatService.getMessages(sessionId).map((m: { id: string; role: string; content: string; relatedCardId: string | null; createdAt: string }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      relatedCardId: m.relatedCardId,
      createdAt: m.createdAt,
    }));
    return { items };
  });

  app.post("/api/chat/sessions/:sessionId/messages", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const body = request.body as { content?: string };
    if (!body.content?.trim()) {
      return reply.status(400).send({ error: "Content required" });
    }
    try {
      const result = await chatService.sendMessage(sessionId, body.content.trim());
      return result;
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 500).send({ error: err.message });
    }
  });
}
