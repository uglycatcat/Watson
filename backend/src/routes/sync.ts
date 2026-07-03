import type { FastifyInstance } from "fastify";
import type { SyncService } from "../services/sync.service.js";

export async function syncRoutes(app: FastifyInstance, syncService: SyncService) {
  app.get("/api/sync", async (request) => {
    const q = request.query as { since?: string };
    return syncService.sync(q.since);
  });
}
