export interface ChatMessageInput {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessageInput[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}
