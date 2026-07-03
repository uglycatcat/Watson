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

async function main() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(token, 12);
  const p = envPath();
  if (!fs.existsSync(p)) {
    console.error(".env not found. Run watson:init first.");
    process.exit(1);
  }
  let content = fs.readFileSync(p, "utf8");
  if (/^WATSON_ACCESS_TOKEN_HASH=/m.test(content)) {
    content = content.replace(/^WATSON_ACCESS_TOKEN_HASH=.*$/m, `WATSON_ACCESS_TOKEN_HASH=${hash}`);
  } else {
    content += `\nWATSON_ACCESS_TOKEN_HASH=${hash}\n`;
  }
  fs.writeFileSync(p, content);
  console.log("\n✅ Token rotated. Old token is now invalid.\n");
  console.log("New access token (shown ONCE):\n");
  console.log(`  ${token}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
