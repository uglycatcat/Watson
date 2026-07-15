import type { ToolDefinition } from "../provider.js";

/**
 * Schedule tools intentionally disabled (Constitution III / FR-028).
 * Chat is plain-text only; do not re-wire these into the LLM loop.
 */
export const LLM_TOOLS: ToolDefinition[] = [];

export const SYSTEM_PROMPT = `You are Watson, a helpful personal assistant. Respond conversationally and concisely in the user's language.`;
