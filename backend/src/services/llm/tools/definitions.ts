import type { ToolDefinition } from "../provider.js";

export const LLM_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "create_card",
      description: "Create a schedule card",
      parameters: {
        type: "object",
        required: ["title", "timeNature"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          timeNature: { type: "string", enum: ["duration", "deadline"] },
          startAt: { type: "string", description: "ISO8601" },
          endAt: { type: "string" },
          deadlineAt: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
          urgency: { type: "string", enum: ["high", "medium", "low"] },
          categoryName: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_cards",
      description: "Query schedule cards from database",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["on_date", "in_range", "due_soon", "all", "search"],
          },
          date: { type: "string", format: "date" },
          rangeStart: { type: "string" },
          rangeEnd: { type: "string" },
          searchQuery: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_cards",
      description: "Search cards by title",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_card",
      description: "Update an existing card",
      parameters: {
        type: "object",
        required: ["cardId"],
        properties: {
          cardId: { type: "string" },
          title: { type: "string" },
          startAt: { type: "string" },
          endAt: { type: "string" },
          deadlineAt: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
          urgency: { type: "string", enum: ["high", "medium", "low"] },
          categoryName: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_delete_card",
      description: "Request delete (requires user confirmation)",
      parameters: {
        type: "object",
        required: ["cardId"],
        properties: { cardId: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_delete_card",
      description: "Confirm pending delete after user says yes",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_pending_action",
      description: "Cancel pending delete or disambiguation",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_category",
      description: "Add a new category",
      parameters: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      },
    },
  },
];

export const SYSTEM_PROMPT = `You are Watson, a helpful personal assistant. Respond conversationally and concisely in the user's language.`;
