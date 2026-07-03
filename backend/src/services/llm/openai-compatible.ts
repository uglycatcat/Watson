import OpenAI from "openai";
import { AnthropicProvider } from "./anthropic.js";
import type { AppConfig } from "../../config/index.js";
import type { ChatMessageInput, LLMProvider, LLMResponse, ToolDefinition } from "./provider.js";

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = "openai-compatible";
  private client: OpenAI;

  constructor(config: AppConfig) {
    this.client = new OpenAI({
      apiKey: config.llm.api_key,
      baseURL: config.llm.base_url,
    });
  }

  async chat(messages: ChatMessageInput[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const openaiMessages = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          content: m.content,
          tool_call_id: m.tool_call_id!,
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await this.client.chat.completions.create({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      messages: openaiMessages,
      tools: tools?.length ? tools : undefined,
    });

    const choice = response.choices[0];
    const msg = choice?.message;
    return {
      content: msg?.content ?? null,
      toolCalls: (msg?.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
    };
  }
}

export function createLlmProvider(config: AppConfig): LLMProvider | null {
  if (!config.llm.api_key) return null;
  if (config.llm.provider === "anthropic") {
    return new AnthropicProvider(config);
  }
  return new OpenAICompatibleProvider(config);
}
