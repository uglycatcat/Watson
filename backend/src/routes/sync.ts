import type { FastifyInstance } from "fastify";
import type { SyncService } from "../services/sync.service.js";

export async function syncRoutes(app: FastifyInstance, syncService: SyncService) {
  app.get("/api/sync", async (request) => {
    const q = request.query as {
      since?: string;
      cardCount?: string;
      cardMax?: string;
      catSig?: string;
    };
    const hints =
      q.cardCount != null || q.catSig != null
        ? {
            cardCount: q.cardCount != null ? Number(q.cardCount) : undefined,
            cardMax: q.cardMax,
            catSig: q.catSig,
          }
        : undefined;
    return syncService.sync(q.since, hints);
  });
}
