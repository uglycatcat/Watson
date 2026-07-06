# Data Model: 日程搜索、编辑增强与视觉重排

**Feature**: `003-schedule-search-edit-visual`  
**Date**: 2026-07-06  
**Storage**: SQLite schema **增量变更** + UI 状态扩展

## 服务端实体变更

### schedule_cards（扩展 001）

| 字段 | 002 | 003 变更 |
|------|-----|----------|
| `title` | NOT NULL | 不变；业务层 trim |
| `title_lower` | — | **新增** NOT NULL UNIQUE；`lower(trim(title))` |
| `time_nature` | NOT NULL enum | **nullable**；NULL = 无时间 |
| `start_at` / `end_at` / `deadline_at` | nullable | 不变；untimed 时全 NULL |
| 其余 | 不变 | importance, urgency, category_id, … |

**Untimed 合法态**:
```
time_nature IS NULL
AND start_at IS NULL AND end_at IS NULL AND deadline_at IS NULL
```

**Partial 非法态**（拒绝 400）:
```
time_nature IS NOT NULL AND (
  (time_nature = 'duration' AND start_at IS NULL) OR
  (time_nature = 'deadline' AND deadline_at IS NULL)
)
```

**Title uniqueness**:
- Scope: 全表（硬删除后行不存在，标题可复用）
- Compare: `title_lower` exact match
- Update self: exclude `id` from check

### categories（不变）

仍用 `name` + `name_lower` 唯一；卡片 `category_id` 仍 NOT NULL（无时间/仅标题创建时默认分类规则同 001/002）。

### chat_messages / owner_preferences（不变）

AI 解耦不删表；`owner_preferences.theme` 行为同 002。

---

## API DTO 变更

### ScheduleCard / ScheduleCardInput

```typescript
type TimeNature = "duration" | "deadline";

interface ScheduleCard {
  // ...
  timeNature: TimeNature | null;  // null = untimed
  startAt: string | null;
  endAt: string | null;
  deadlineAt: string | null;
}

interface ScheduleCardInput {
  title: string;                    // required
  timeNature?: TimeNature | null;   // omit or null → untimed
  startAt?: string | null;
  endAt?: string | null;
  deadlineAt?: string | null;
  // importance, urgency, categoryId, description — optional with defaults
}
```

### CardQueryFilters（GET /api/cards）

| 字段 | 类型 | 003 新增 |
|------|------|----------|
| `view` | day \| week \| month \| all | 不变 |
| `date` | YYYY-MM-DD | 不变 |
| `categoryId` | uuid | 已有，前端接通 |
| `importance` | high \| medium \| low | 不变 |
| `urgency` | high \| medium \| low | 已有，前端接通 |
| `timeNature` | duration \| deadline | 已有，前端接通 |
| `hasTime` | boolean string | **新增** |
| `sort` | time \| priority \| title \| createdAt | **扩展** |

---

## UI 状态实体（非持久）

### GlobalSearchContext

| 字段 | Type | 说明 |
|------|------|------|
| `focused` | boolean | 搜索框焦点 |
| `query` | string | 当前输入 |
| `results` | ScheduleCard[] | top 8 匹配 |
| `open` | boolean | 下拉可见 |

**Lifecycle**: TopBar focus → AppShell dim overlay；Escape/blur → reset。

### CardDetailModal（扩展 002）

| 字段 | Type | 说明 |
|------|------|------|
| `mode` | `view` \| `edit` | 两态 |
| `draft` | CardFormValues | edit 时表单 |
| `confirmDeleteOpen` | boolean | 不变 |

### CardFormValues / CardFormDraft（扩展）

| 字段 | 必填 | 003 规则 |
|------|------|----------|
| `title` | ✅ | trim 非空 |
| `timeNature` | — | `null` = 无时间 |
| `startAt/endAt/deadlineAt` | 条件 | timeNature 选中时填齐 |
| 其他 | — | 默认同 002 |

### AllViewFilterState

| 字段 | Type | 默认 |
|------|------|------|
| `categoryId` | string \| null | null（全部） |
| `importance` | Level \| null | null |
| `urgency` | Level \| null | null |
| `timeNature` | TimeNature \| null | null |
| `hasTime` | boolean \| null | null（全部） |
| `sort` | SortKey | `time` |

---

## 错误码

| HTTP | Code / Message | 场景 |
|------|----------------|------|
| 400 | validation message | 标题空、部分时间、时间非法 |
| 409 | Title already exists | 重名 |
| 404 | Card not found | 编辑已删卡片 |

---

## Migration 清单

1. `0001_title_unique_untimed.sql`
   - Add `title_lower`, backfill, dedupe rename
   - UNIQUE index on `title_lower`
   - Alter `time_nature` nullable

**Rollback note**: 003 依赖新列；rollback 需备份 DB。
