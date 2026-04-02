import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicSchedulesPath = path.join(
  __dirname,
  "public/data/watson_schedules.json",
);
const distSchedulesPath = path.join(
  __dirname,
  "dist/data/watson_schedules.json",
);

/** 仅注册在 vite preview：写 dist（页面读取）+ public（git 源文件） */
function watsonPreviewSaveMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const url = req.url ?? "";
  if (!url.startsWith("/__watson/save-schedules")) {
    next();
    return;
  }
  if (req.method !== "POST") {
    next();
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      JSON.parse(raw);
      fs.mkdirSync(path.dirname(distSchedulesPath), { recursive: true });
      fs.mkdirSync(path.dirname(publicSchedulesPath), { recursive: true });
      fs.writeFileSync(distSchedulesPath, raw, "utf8");
      fs.writeFileSync(publicSchedulesPath, raw, "utf8");
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("ok");
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(String(e));
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "watson-save-schedules-preview",
      configurePreviewServer(server) {
        server.middlewares.use(watsonPreviewSaveMiddleware);
      },
    },
  ],
});
