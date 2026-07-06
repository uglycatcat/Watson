import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { loadConfig } from "./config/index.js";
import { getDb, runMigrations } from "./db/index.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { registerAuthHook } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { cardsRoutes } from "./routes/cards.js";
import { categoriesRoutes } from "./routes/categories.js";
import { chatRoutes } from "./routes/chat.js";
import { preferencesRoutes } from "./routes/preferences.js";
import { syncRoutes } from "./routes/sync.js";
import { CategoryService } from "./services/category.service.js";
import { ScheduleService } from "./services/schedule.service.js";
import { ChatService } from "./services/chat.service.js";
import { SyncService } from "./services/sync.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_COOKIE = "watson_session";

export interface SessionData {
  authenticated?: boolean;
  authenticatedAt?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    session: SessionData;
  }
}

function encodeSession(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeSession(raw: string | undefined): SessionData {
  if (!raw) return {};
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionData;
  } catch {
    return {};
  }
}

export async function buildApp() {
  const config = loadConfig();
  runMigrations();
  const db = getDb();

  const categoryService = new CategoryService(db);
  const scheduleService = new ScheduleService(db, categoryService);
  const chatService = new ChatService(db, config);
  const syncService = new SyncService(db, scheduleService, categoryService);

  const app = Fastify({ logger: process.env.NODE_ENV === "production" });

  registerErrorHandler(app);

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  app.addHook("onRequest", async (request) => {
    request.session = decodeSession(request.cookies[SESSION_COOKIE]);
  });

  app.decorateReply("setSessionCookie", function (this: import("fastify").FastifyReply, session: SessionData) {
    this.setCookie(SESSION_COOKIE, encodeSession(session), {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      // 会话 cookie：关闭浏览器后失效，与前端 sessionStorage 验证码门禁一致
    });
    return this;
  });

  app.decorateReply("clearSessionCookie", function (this: import("fastify").FastifyReply) {
    this.clearCookie(SESSION_COOKIE, { path: "/" });
    return this;
  });

  registerAuthHook(app);

  await authRoutes(app);

  await cardsRoutes(app, scheduleService);
  await categoriesRoutes(app, categoryService);
  await chatRoutes(app, chatService);
  await preferencesRoutes(app, db);
  await syncRoutes(app, syncService);

  const distPath = path.join(__dirname, "../../frontend/dist");
  if (fs.existsSync(distPath)) {
    await app.register(fastifyStatic, { root: distPath, prefix: "/" });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return { app, config };
}

declare module "fastify" {
  interface FastifyReply {
    setSessionCookie(session: SessionData): FastifyReply;
    clearSessionCookie(): FastifyReply;
  }
}
