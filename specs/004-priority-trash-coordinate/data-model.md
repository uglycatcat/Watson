# Data Model: 优先级量化、垃圾箱与坐标视图

**Feature**: `004-priority-trash-coordinate`  
**Date**: 2026-07-15  
**Storage**: SQLite `schedule_cards` **三次增量 migration** + UI 状态

## 服务端实体：schedule_cards

### 字段（相对 003 终态）

| 字段 | 003 | 004 |
|------|-----|-----|
| `title` / `title_lower` | UNIQUE 全表 | `title_lower` **部分唯一**仅 `status='active'` |
| `time_nature` | nullable duration/deadline | **废弃**：迁移后 NULL；API 不再暴露 |
| `start_at` | nullable | 有值 ⇔ **已安排** |
| `end_at` | nullable | 可选上限；不得单独有 end |
| `deadline_at` | 截止型用 | 迁移清空；业务不再读写 |
| `importance` | enum high/medium/low | **INTEGER 0..10**（默认 5） |
| `urgency` | enum | **INTEGER 0..10**（默认 5） |
| `created_at` | 已有 | 不变；日/全部排序用 |
| `updated_at` | 已有 | 内容 create/PATCH 刷新 |
| `status` | — | **新增** `active` \| `completed` \| `deleted`（默认 active） |
| `trashed_at` | — | **新增** TEXT nullable；进箱时置 ISO；恢复清 NULL |

### 时间合法态

```
未安排: start_at IS NULL AND end_at IS NULL
已安排: start_at IS NOT NULL
        AND (end_at IS NULL OR end_at >= start_at)
非法:   end_at IS NOT NULL AND start_at IS NULL
非法:   end_at < start_at
```

### 优先级合法态

```
importance ∈ [0,10] ∧ urgency ∈ [0,10] ∧ 均为整数
```

### 生命周期

```
active ─── complete ───► completed (trashed_at set)
active ─── softDelete ─► deleted   (trashed_at set)
completed|deleted ── restore ──► active (trashed_at NULL)  [title unique among active]
completed|deleted ── permanentDelete ──► (row gone)
```

### Migration 数据变换

**0002**:
| 旧 | 新 |
|----|-----|
| high | 8 |
| medium | 5 |
| low | 2 |
| 其它 | 5 |

**0003**:
| 旧 time_nature | 变换 |
|----------------|------|
| duration | 保留 start/end；time_nature→NULL；deadline→NULL |
| deadline | **start/end/deadline/time_nature 全 NULL（未安排）** |
| NULL（无时间） | 保持全空 |

**0004**:
- 所有现有行 `status='active'`, `trashed_at=NULL`
- Drop 全表 unique on `title_lower`；建 partial unique where active

### 标题唯一

- 比较：`lower(trim(title))`
- Scope：**仅 active**
- Update/restore：exclude self id；冲突 409

### 查询默认值

| API | status 过滤 | 排序默认 |
|-----|-------------|----------|
| view=day/week/month/all | active | 既有 + all 支持 createdAt |
| view=trash | completed, deleted | trashed_at DESC |
| GET :id | 任意未永久删除 | — |

---

## API DTO

```typescript
type CardStatus = "active" | "completed" | "deleted";

interface ScheduleCard {
  id: string;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  importance: number; // 0..10
  urgency: number;    // 0..10
  categoryId: string;
  status: CardStatus;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 不再包含 timeNature / deadlineAt
}

interface ScheduleCardInput {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  importance?: number;
  urgency?: number;
  categoryId?: string;
}
```

### CardQueryFilters

| 字段 | 类型 | 说明 |
|------|------|------|
| view | day\|week\|month\|all\|**trash** | trash=箱 |
| date | YYYY-MM-DD | 日历视图 |
| categoryId | uuid | |
| importance | 0..10 | 精确匹配 |
| urgency | 0..10 | 精确匹配 |
| scheduled | true\|false | 替换 hasTime；true=有 startAt |
| sort | time\|priority\|title\|createdAt | priority 用新 0..10 评分 |

废弃：`timeNature`、`hasTime`（实现期可忽略或 400）。

**priorityScore 建议**: `importance * 11 + urgency`（或等价保留相对序）。

---

## UI 状态（非持久 / session）

### TrashView

| 字段 | 说明 |
|------|------|
| items | completed+deleted，trashedAt 倒序网格 |
| badge | completed=对勾；deleted=红圆 |

### DetailEditorSession（活跃）

| 字段 | 说明 |
|------|------|
| snapshot | 打开时字段副本 |
| draft | 当前编辑 |
| dirty | draft ≠ snapshot |
| resetEnabled | dirty；UI 按钮文案「重置」（非垃圾箱「恢复」） |

### DetailReadonlySession（箱内）

只读展示；无 draft 提交。

### QuadrantOverlay

| 字段 | 说明 |
|------|------|
| open | boolean |
| sourceView | day \| all |
| buckets | Map<`${u},${i}`, ScheduleCard[]> |
| hoverKey | 当前悬停桶 |

### ChatPanel

默认 `chatOpen=false`（无键或显式 0）。

---

## 实体关系（概念）

```text
Owner (single session)
  └── ScheduleCard[*]
        ├── Category (required)
        ├── TimeState: scheduled | unscheduled (derived)
        └── Lifecycle: active | completed | deleted | (gone)
```

**坐标点聚合**非持久实体：由 active 卡集合运行时分桶。
