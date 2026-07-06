import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { verifyAccessCode } from "../auth/access-code.js";

export async function authRoutes(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: false,
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const body = request.body as { code?: string };
    if (!body.code?.trim()) {
      return reply.status(400).send({ error: "Code required" });
    }
    if (!verifyAccessCode(body.code)) {
      return reply.status(401).send({ error: "Invalid code" });
    }
    request.session = { authenticated: true, authenticatedAt: new Date().toISOString() };
    reply.setSessionCookie(request.session);
    return { authenticated: true };
    },
  );

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
