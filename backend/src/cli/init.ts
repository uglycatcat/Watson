import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { config as loadEnv } from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

loadEnv({ path: path.join(repoRoot, ".env") });

function envPath() {
  return path.join(repoRoot, ".env");
}

function readEnv(): Record<string, string> {
  const p = envPath();
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const out: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function writeEnv(updates: Record<string, string>) {
  const p = envPath();
  const example = path.join(repoRoot, ".env.example");
  const current = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : fs.readFileSync(example, "utf8");
  let lines = current.split("\n");
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(p, lines.join("\n") + "\n");
}

async function main() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(token, 12);
  const sessionSecret = crypto.randomBytes(32).toString("hex");

  const updates: Record<string, string> = {
    WATSON_ACCESS_TOKEN_HASH: hash,
  };
  const existing = readEnv();
  if (!existing.SESSION_SECRET) {
    updates.SESSION_SECRET = sessionSecret;
  }
  writeEnv(updates);

  console.log("\n✅ Watson initialized.\n");
  console.log("Save this access token securely (shown ONCE):\n");
  console.log(`  ${token}\n`);
  console.log("Token hash written to .env as WATSON_ACCESS_TOKEN_HASH");
  console.log("Run: npm run db:migrate && npm run dev\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
