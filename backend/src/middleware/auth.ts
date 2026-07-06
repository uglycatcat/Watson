import type { FastifyReply, FastifyRequest } from "fastify";

const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/login"]);

export function registerAuthHook(app: { addHook: Function }) {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith("/api/")) return;
    const path = request.url.split("?")[0];
    if (PUBLIC_PATHS.has(path)) return;
    if (path === "/api/auth/logout") return;

    if (!request.session?.authenticated) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
