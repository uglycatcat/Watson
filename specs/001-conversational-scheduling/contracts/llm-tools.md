# LLM Tool Contracts

**Feature**: `001-conversational-scheduling`  
**Date**: 2026-07-03

后端向 LLM 暴露的 function/tool 定义。所有写操作 MUST 经 tool 执行，禁止 LLM 直接输出伪造的 JSON 作为最终结果。

## Tools

### `create_card`

创建日程卡片。

```json
{
  "name": "create_card",
  "parameters": {
    "type": "object",
    "required": ["title", "timeNature"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "timeNature": { "type": "string", "enum": ["duration", "deadline"] },
      "startAt": { "type": "string", "description": "ISO8601, duration 必填" },
      "endAt": { "type": "string", "description": "ISO8601, duration 可选，默认 start+1h" },
      "deadlineAt": { "type": "string", "description": "ISO8601, deadline 必填" },
      "importance": { "type": "string", "enum": ["high", "medium", "low"], "default": "medium" },
      "urgency": { "type": "string", "enum": ["high", "medium", "low"], "default": "medium" },
      "categoryName": { "type": "string", "description": "已有或新建分类名" }
    }
  }
}
```

**Returns**: `{ card: ScheduleCard }` 或 `{ error: string }`

---

### `update_card`

```json
{
  "name": "update_card",
  "parameters": {
    "type": "object",
    "required": ["cardId"],
    "properties": {
      "cardId": { "type": "string" },
      "title": { "type": "string" },
      "description": { "type": "string" },
      "startAt": { "type": "string" },
      "endAt": { "type": "string" },
      "deadlineAt": { "type": "string" },
      "importance": { "type": "string", "enum": ["high", "medium", "low"] },
      "urgency": { "type": "string", "enum": ["high", "medium", "low"] },
      "categoryName": { "type": "string" }
    }
  }
}
```

**Precondition**: 若 `cardId` 缺失，先调用 `search_cards` 或返回 disambiguation。

---

### `request_delete_card`

发起删除（**不立即删除**）。设置 `pending_action=delete_confirm`。

```json
{
  "name": "request_delete_card",
  "parameters": {
    "type": "object",
    "required": ["cardId"],
    "properties": {
      "cardId": { "type": "string" }
    }
  }
}
```

**Returns**: `{ pending: true, cardTitle: string }` — 助手 MUST 向用户确认。

---

### `confirm_delete_card`

用户明确肯定后调用。

```json
{
  "name": "confirm_delete_card",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

**Precondition**: 存在 `pending_action.type === delete_confirm`  
**Returns**: `{ deleted: true, cardId }` 或 `{ error: "no_pending_delete" }`

---

### `cancel_pending_action`

用户拒绝删除或取消歧义选择。

```json
{
  "name": "cancel_pending_action",
  "parameters": { "type": "object", "properties": {} }
}
```

---

### `query_cards`

只读查询；LLM 答复 MUST 基于此结果。

```json
{
  "name": "query_cards",
  "parameters": {
    "type": "object",
    "properties": {
      "mode": {
        "type": "string",
        "enum": ["on_date", "in_range", "due_soon", "all", "search"],
        "description": "due_soon 使用 owner_preferences.dueSoonDays"
      },
      "date": { "type": "string", "format": "date" },
      "rangeStart": { "type": "string", "format": "date" },
      "rangeEnd": { "type": "string", "format": "date" },
      "searchQuery": { "type": "string" }
    }
  }
}
```

**Returns**: `{ items: ScheduleCard[] }`

---

### `search_cards`

模糊匹配标题，供修改/删除前定位。

```json
{
  "name": "search_cards",
  "parameters": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer", "default": 5 }
    }
  }
}
```

**Returns**: `{ items: ScheduleCard[] }` — 若 `length > 1`，助手列出候选项。

---

### `add_category`

```json
{
  "name": "add_category",
  "parameters": {
    "type": "object",
    "required": ["name"],
    "properties": {
      "name": { "type": "string", "maxLength": 32 }
    }
  }
}
```

---

## System Prompt 要点（摘要）

1. 你是 Watson 日程助手；仅处理日程相关请求。
2. 增删改 MUST 调用 tools；查询 MUST 调用 `query_cards` / `search_cards`，不得编造未返回的数据。
3. 删除 MUST 先 `request_delete_card`，等用户明确肯定后再 `confirm_delete_card`。
4. 时间解析基于 `owner_preferences.timezone` 与当前时间；模糊时间向用户确认具体日期。
5. 缺少必要时间字段时追问，不调用 `create_card`。

## Provider 兼容性

| Provider | Tool calling 支持 |
|----------|-------------------|
| OpenAI / DeepSeek (OpenAI API) | Native `tools` parameter |
| Anthropic | `tools` via Messages API adapter |
| custom (OpenAI-compatible) | 依赖 endpoint 支持；不支持时降级 JSON mode + schema 校验（Phase 2 fallback） |

v1 MVP：**必须**跑通至少一个 native tool-calling 的 OpenAI-compatible endpoint。
