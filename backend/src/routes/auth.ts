import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/index.js";

export async function authRoutes(app: FastifyInstance, config: AppConfig) {
  app.get("/api/health", async () => ({ status: "ok" }));

  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as { token?: string };
    if (!body.token) {
      return reply.status(400).send({ error: "Token required" });
    }
    if (!config.accessTokenHash) {
      return reply.status(503).send({ error: "Server not initialized. Run npm run watson:init" });
    }
    const bcrypt = await import("bcrypt");
    const valid = await bcrypt.default.compare(body.token, config.accessTokenHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid token" });
    }
    request.session = { authenticated: true, authenticatedAt: new Date().toISOString() };
    reply.setSessionCookie(request.session);
    return { authenticated: true };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    request.session = {};
    reply.clearSessionCookie();
    return reply.status(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    if (!request.session.authenticated) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return { authenticated: true };
  });
}
