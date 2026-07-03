# Data Model: 对话式日程管理

**Feature**: `001-conversational-scheduling`  
**Date**: 2026-07-03  
**Storage**: SQLite (`data/watson.db`)

## Entity Relationship

```text
Category 1──* ScheduleCard
OwnerPreferences (singleton, id=1)
ChatSession 1──* ChatMessage
ChatSession 0..1 PendingAction (embedded JSON)
```

## Enums

| Enum | Values | Notes |
|------|--------|-------|
| `TimeNature` | `duration`, `deadline` | 持续型 / 截止型 |
| `PriorityLevel` | `high`, `medium`, `low` | 重要度 & 紧急度共用 |
| `ChatRole` | `user`, `assistant`, `system`, `tool` | 对齐 LLM 消息角色 |
| `PendingActionType` | `delete_confirm`, `disambiguate` | 对话中间状态 |

## Tables

### `categories`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT (UUID) | PK | |
| `name` | TEXT | NOT NULL, UNIQUE (CI) | 分类名；大小写不敏感唯一 |
| `is_preset` | INTEGER | NOT NULL DEFAULT 0 | 1=系统预设（工作/个人/健康） |
| `created_at` | TEXT (ISO8601) | NOT NULL | |

**Seed data**: `工作`, `个人`, `健康`（`is_preset=1`）

**Validation**:
- `name` 长度 1–32 字符，trim 后非空
- 新增时 CI 冲突 → 返回已有 category

---

### `schedule_cards`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT (UUID) | PK | |
| `title` | TEXT | NOT NULL | 标题，1–200 字符 |
| `description` | TEXT | NULL | 可选描述 |
| `time_nature` | TEXT | NOT NULL | `duration` \| `deadline` |
| `start_at` | TEXT (ISO8601) | NULL | 持续型必填 |
| `end_at` | TEXT (ISO8601) | NULL | 持续型必填 |
| `deadline_at` | TEXT (ISO8601) | NULL | 截止型必填 |
| `importance` | TEXT | NOT NULL DEFAULT `medium` | |
| `urgency` | TEXT | NOT NULL DEFAULT `medium` | |
| `category_id` | TEXT | FK → categories.id | NOT NULL |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Indexes**:
- `idx_cards_start_at` ON (`start_at`)
- `idx_cards_deadline_at` ON (`deadline_at`)
- `idx_cards_updated_at` ON (`updated_at`) — 供 sync 增量拉取
- `idx_cards_category` ON (`category_id`)

**Validation rules**:
- `time_nature = duration` → `start_at` & `end_at` 必填，`deadline_at` NULL
- `time_nature = deadline` → `deadline_at` 必填，`start_at` & `end_at` NULL
- `duration`: `end_at > start_at`（否则拒绝，FR edge case）
- 默认持续时长：未指定 `end_at` 时 `start_at + 1h`
- 默认 importance/urgency：`medium`

**Priority score**（用于排序，非存储字段）:
```text
score = importance_weight * 3 + urgency_weight * 1
high=3, medium=2, low=1
```

---

### `owner_preferences`

单例行（`id = 1`）

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, CHECK(id=1) | 固定 1 |
| `due_soon_days` | INTEGER | NOT NULL DEFAULT 7 | 「即将到期」窗口天数 |
| `theme` | TEXT | NOT NULL DEFAULT `system` | `light` \| `dark` \| `system` |
| `timezone` | TEXT | NOT NULL DEFAULT `Asia/Shanghai` | IANA TZ |
| `updated_at` | TEXT | NOT NULL | |

---

### `chat_sessions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT (UUID) | PK | |
| `pending_action` | TEXT (JSON) | NULL | 见 PendingAction schema |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**PendingAction JSON schema**:
```json
{
  "type": "delete_confirm",
  "cardId": "uuid",
  "cardTitle": "牙医预约",
  "askedAt": "ISO8601"
}
```
或
```json
{
  "type": "disambiguate",
  "operation": "update|delete",
  "candidateCardIds": ["uuid", "..."],
  "askedAt": "ISO8601"
}
```

---

### `chat_messages`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT (UUID) | PK | |
| `session_id` | TEXT | FK → chat_sessions.id | |
| `role` | TEXT | NOT NULL | ChatRole |
| `content` | TEXT | NOT NULL | 用户可见文本或 tool 摘要 |
| `tool_calls` | TEXT (JSON) | NULL | 可选，审计用 |
| `related_card_id` | TEXT | NULL | 关联卡片 |
| `created_at` | TEXT | NOT NULL | |

**Retention**: v1 保留全部消息；可按 session 清理（后续优化）。

---

### `auth_config`（运行时，非 DB 表）

存于环境变量 / 配置文件：
- `WATSON_ACCESS_TOKEN_HASH` — bcrypt hash
- `SESSION_SECRET` — cookie 签名密钥
- `SESSION_TTL_DAYS` — 默认 30

---

## State Transitions

### ScheduleCard lifecycle

```text
[创建] → active
active → [update] → active
active → [delete confirmed] → (removed)
```

### Delete flow (FR-008)

```text
User: "取消牙医预约"
  → LLM calls delete_card(cardId) 
  → Backend sets pending_action=delete_confirm (NOT deleted yet)
  → Assistant: "确定删除牙医预约吗？"
User: "确定"
  → LLM calls confirm_delete
  → Backend deletes row, clears pending_action
User: "不要"
  → clear pending_action, card unchanged
```

### Chat session

```text
idle → pending_delete_confirm → idle
idle → disambiguate → (user picks) → idle
```

---

## Sync Protocol

**Client** stores `lastSyncAt` (max `updated_at` seen).

**`GET /api/sync?since=ISO8601`** returns:
```json
{
  "serverTime": "...",
  "cards": { "upserted": [...], "deletedIds": [] },
  "preferences": { ... } | null,
  "categories": { "upserted": [...] } | null
}
```

v1 不做物理删除 tombstone；删除即 hard delete，`deletedIds` 由客户端 diff（或 future revision 加 deleted_at 软删）。

**Phase 1 简化**: sync 返回全量 cards + preferences if any `updated_at > since`（单用户数据量小）。

---

## Query Helpers (service layer)

| Query | Used by |
|-------|---------|
| `cardsInRange(start, end)` | 日/周/月视图、AI query |
| `cardsDueSoon(days)` | 「deadline 快到了」 |
| `cardsOnDate(date)` | 「这周三有什么安排」 |
| `findByTitleFuzzy(q, limit)` | 修改/删除匹配 |
| `filterAll(filters, sort)` | 全部视图 |

---

## Migration Strategy

- Drizzle Kit migrations in `backend/drizzle/`
- `0001_initial.sql`: all tables + category seeds
- App startup: `migrate()` before listen
