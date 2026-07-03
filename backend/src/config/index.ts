import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import YAML from "yaml";
import { z } from "zod";

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

loadEnv({ path: path.join(repoRoot(), ".env") });

const ConfigSchema = z.object({
  server: z
    .object({
      port: z.number().default(3000),
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
  preferences: z
    .object({
      timezone: z.string().default("Asia/Shanghai"),
      due_soon_days: z.number().default(7),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof ConfigSchema> & {
  accessTokenHash: string;
  sessionSecret: string;
};

function loadYamlConfig(): z.infer<typeof ConfigSchema> {
  const configPath = process.env.CONFIG_PATH ?? path.join(repoRoot(), "config.yaml");
  if (!fs.existsSync(configPath)) {
    return ConfigSchema.parse({});
  }
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = YAML.parse(raw) ?? {};
  return ConfigSchema.parse(parsed);
}

export function loadConfig(): AppConfig {
  const yaml = loadYamlConfig();
  const accessTokenHash = process.env.WATSON_ACCESS_TOKEN_HASH ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!sessionSecret || sessionSecret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
    }
  }
  return {
    ...yaml,
    llm: {
      ...yaml.llm,
      provider: (process.env.LLM_PROVIDER as AppConfig["llm"]["provider"]) ?? yaml.llm.provider,
      api_key: process.env.LLM_API_KEY ?? yaml.llm.api_key,
      base_url: process.env.LLM_BASE_URL ?? yaml.llm.base_url,
      model: process.env.LLM_MODEL ?? yaml.llm.model,
    },
    accessTokenHash,
    sessionSecret: sessionSecret || "dev-only-insecure-secret",
    session: {
      ttl_days: Number(process.env.SESSION_TTL_DAYS ?? yaml.session.ttl_days),
    },
    server: {
      port: Number(process.env.PORT ?? yaml.server.port),
      host: process.env.HOST ?? yaml.server.host,
    },
  };
}

export function isLlmConfigured(config: AppConfig): boolean {
  return Boolean(config.llm.api_key?.trim());
}
