import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config/index.js";
import type { SessionData } from "../app.js";

const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/login"]);

export function registerAuthHook(app: { addHook: Function }, config: AppConfig) {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith("/api/")) return;
    const path = request.url.split("?")[0];
    if (PUBLIC_PATHS.has(path)) return;
    if (path === "/api/auth/logout") return;

    if (!request.session?.authenticated) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    if (!config.accessTokenHash && process.env.NODE_ENV === "production") {
      return reply.status(503).send({ error: "Server not initialized. Run watson:init." });
    }
  });
}

export function saveSession(reply: FastifyReply, session: SessionData) {
  reply.setSessionCookie(session);
}
