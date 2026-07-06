/** 单用户四字符验证码（可通过环境变量覆盖，默认 ANNA） */
export const DEFAULT_ACCESS_CODE = "ANNA";

export function resolveAccessCode(): string {
  const raw = process.env.WATSON_ACCESS_CODE?.trim();
  if (raw) return raw.toUpperCase();
  return DEFAULT_ACCESS_CODE;
}

export function verifyAccessCode(input: string): boolean {
  const normalized = input.trim().toUpperCase();
  if (normalized.length !== 4) return false;
  return normalized === resolveAccessCode();
}
