import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

loadEnv({ path: path.join(repoRoot(), ".env") });

const ConfigSchema = z.object({
  server: z
    .object({
      port: z.number().default(3001),
      host: z.string().default("0.0.0.0"),
    })
    .default({}),
  session: z
    .object({
      ttl_days: z.number().default(30),
    })
    .default({}),
  llm: z
    .object({
      provider: z.enum(["openai", "deepseek", "custom", "anthropic"]).default("openai"),
      api_key: z.string().optional(),
      base_url: z.string().default("https://api.openai.com/v1"),
      model: z.string().default("gpt-4o-mini"),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof ConfigSchema> & {
  sessionSecret: string;
};

export function loadConfig(): AppConfig {
  const base = ConfigSchema.parse({});
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!sessionSecret || sessionSecret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
    }
  }
  return {
    llm: {
      provider: (process.env.LLM_PROVIDER as AppConfig["llm"]["provider"]) ?? base.llm.provider,
      api_key: process.env.LLM_API_KEY ?? base.llm.api_key,
      base_url: process.env.LLM_BASE_URL ?? base.llm.base_url,
      model: process.env.LLM_MODEL ?? base.llm.model,
    },
    sessionSecret: sessionSecret || "dev-only-insecure-secret",
    session: {
      ttl_days: Number(process.env.SESSION_TTL_DAYS ?? base.session.ttl_days),
    },
    server: {
      port: Number(process.env.PORT ?? base.server.port),
      host: process.env.HOST ?? base.server.host,
    },
  };
}

export function isLlmConfigured(config: AppConfig): boolean {
  return Boolean(config.llm.api_key?.trim());
}
