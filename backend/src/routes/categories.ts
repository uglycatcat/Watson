import type { FastifyInstance } from "fastify";
import type { CategoryService } from "../services/category.service.js";

export async function categoriesRoutes(app: FastifyInstance, categoryService: CategoryService) {
  app.get("/api/categories", async () => {
    const items = categoryService.list().map((c) => ({
      id: c.id,
      name: c.name,
      isPreset: c.isPreset,
      deletable: c.nameLower !== "无",
    }));
    return { items };
  });

  app.post("/api/categories", async (request, reply) => {
    const body = request.body as { name?: string };
    if (!body.name?.trim()) {
      return reply.status(400).send({ error: "Name required" });
    }
    try {
      const cat = categoryService.create(body.name);
      return reply
        .status(201)
        .send({ id: cat.id, name: cat.name, isPreset: cat.isPreset, deletable: true });
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 400).send({ error: err.message });
    }
  });

  app.delete("/api/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      categoryService.delete(id);
      return reply.status(204).send();
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 500).send({ error: err.message });
    }
  });
}
