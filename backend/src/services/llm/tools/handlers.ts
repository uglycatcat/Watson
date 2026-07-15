/**
 * Writable schedule tools are stubbed out. AI must not mutate schedule data.
 * Kept as a no-op module so accidental imports fail safely.
 */
export function executeTool(name: string, _args: Record<string, unknown>): unknown {
  return {
    error: `Tool "${name}" is disabled. Schedule changes are only allowed via UI/API.`,
  };
}
