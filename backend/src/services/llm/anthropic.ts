import Anthropic from "@anthropic-ai/sdk";
import type { AppConfig } from "../../config/index.js";
import type { ChatMessageInput, LLMProvider, LLMResponse, ToolDefinition } from "./provider.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(config: AppConfig) {
    this.client = new Anthropic({ apiKey: config.llm.api_key });
  }

  async chat(messages: ChatMessageInput[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const rest = messages.filter((m) => m.role !== "system");

    const anthropicTools = tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters as Record<string, unknown>,
    }));

    const response = await this.client.messages.create({
      model: process.env.LLM_MODEL ?? "claude-3-5-haiku-latest",
      max_tokens: 4096,
      system,
      messages: rest.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      tools: anthropicTools as Anthropic.Messages.Tool[],
    });

    let content: string | null = null;
    const toolCalls: LLMResponse["toolCalls"] = [];

    for (const block of response.content) {
      if (block.type === "text") content = (content ?? "") + block.text;
      if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }

    return { content, toolCalls };
  }
}
