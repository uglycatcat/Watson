# Data Model: 日报、分类管理、日程阶段与体验升级

**Feature**: `007-daily-category-stage-upgrade`  
**Date**: 2026-07-20  
**Storage**: SQLite + Drizzle ORM

## 1. DailyReport（新增持久化实体）

每日 GRAI 日报是按所有者日历日期保存的独立记录，与日程卡片没有外键、归属或生命周期依赖。

### Fields

| Field | Storage | Required | Default | Rules |
|-------|---------|----------|---------|-------|
| `date` | text, primary key | yes | — | 严格 `YYYY-MM-DD`；每个日期最多一条 |
| `goal` | text | yes | `""` | 纯文本输入，可包含 Markdown 标记 |
| `result` | text | yes | `""` | 纯文本输入，可包含 Markdown 标记 |
| `analysis` | text | yes | `""` | 对应 Analysis & Insight |
| `createdAt` | text | yes | 创建时刻 | ISO 8601；upsert 更新时保持不变 |
| `updatedAt` | text | yes | 当前时刻 | 每次成功保存刷新 |

### Identity and uniqueness

- `date` 是自然主键，不另设 UUID。
- 日期按 owner timezone 下的日视图锚定日解释，不是 UTC 时间戳。
- 表与 `schedule_cards` 无外键。

### Lifecycle

```text
Absent --PUT--> Created --PUT--> Updated
```

- GET absent 返回 `item: null`。
- PUT 可创建或覆盖当天完整三栏快照。
- 本轮没有删除、历史版本、跨日合并、搜索或导出。
- 三栏都为空仍是合法已保存记录，与 absent 可通过 `item` 是否为 null 区分。

### Validation

- 路径日期必须通过严格格式和真实日历日期校验。
- 三栏请求字段必须为字符串；不接受对象、数组或 null。
- 后端只保存纯文本，不解析 Markdown。
- 前端不得启用原始 HTML 渲染。

## 2. ScheduleCard.stage（既有实体新增字段）

stage 表达所有者当前处理进度，与卡片时间安排和生命周期正交。

### Stored values

| Stored value | UI label | Meaning |
|--------------|----------|---------|
| `not_started` | 未开始 | 尚未开始处理 |
| `in_progress` | 正在处理 | 当前正在处理 |
| `wrapping_up` | 等待收尾 | 主体完成，仍需收尾 |

### Schema change

```text
schedule_cards.stage TEXT NOT NULL DEFAULT 'not_started'
```

- migration 为全部历史行提供 `not_started`。
- 新卡片省略 stage 时由服务/数据库默认成 `not_started`。
- 建立 `idx_cards_stage`，为“全部”视图筛选保留查询能力。

### State transitions

活跃卡片允许三态之间任意切换：

```text
not_started <--> in_progress <--> wrapping_up
      \____________________________/
```

- stage 更新只修改 `stage` 与 `updatedAt`。
- stage 不推导、不清空也不补写 `startAt/endAt`。
- stage 不触发 completed/deleted，也不受日期流逝自动改变。
- completed/deleted 卡片沿用现有只读限制；恢复后保留归档前 stage。

### Filtering

- 只有 `view=all` 支持 stage 精确筛选。
- 与 category、importance、urgency、scheduled 等条件按 AND 组合。
- trash 不因本轮增加 stage 筛选器。

## 3. Category（既有实体，新增系统不变量与删除转换）

### Existing fields

| Field | Rules |
|-------|-------|
| `id` | text primary key |
| `name` | 非空且唯一 |
| `nameLower` | trim 后小写；非空且唯一 |
| `isPreset` | 标示系统预置来源，不等同于不可删除 |
| `createdAt` | ISO 8601 |

### 「无」system category

- migration 先查找 `nameLower="无"`：若已存在则保留原 ID 和卡片引用并设置 `isPreset=true`；仅不存在时使用默认系统 ID 创建「无」。
- seed 每次 migration 后按 `nameLower` 幂等确认它存在。
- 「工作 / 个人 / 健康」只作为全新数据库的初始分类；首次初始化后，seed 不得重新创建被所有者删除的任何普通或预置分类。
- 任何用户路径都不能删除或重命名「无」。
- 「无」是删除其他分类时所有关联卡片的目标分类。

### Delete transition

```text
Category exists
  -> validate category != "无"
  -> update every schedule_card(categoryId = deletedId) to noneId
  -> delete category
  -> commit
```

- update + delete 必须在同一事务。
- 卡片更新覆盖 active、completed、deleted，保证垃圾箱恢复路径仍有有效分类。
- 可返回 `reassignedCardCount` 供 UI 成功反馈。
- 分类不存在返回 404；删除「无」返回 409。
- 删除失败时事务回滚，卡片引用与分类均保持原状。

### Default category resolution

```text
if categoryId explicitly supplied:
  validate and use it
else if category "个人" exists:
  use "个人"
else:
  use "无"
```

- 「个人」允许被所有者删除。
- 删除「个人」后不由 seed 或创建卡片路径自动重建。
- 当前数据库 `category_id` 为 `NOT NULL`；本轮保持该约束。
- 不执行“历史空分类归无”迁移；合法现有数据库没有 null categoryId。

## 4. ScheduleCard（整合后的相关字段）

| Field group | Fields | 007 impact |
|-------------|--------|------------|
| Identity | `id`, `title`, `titleLower` | unchanged |
| Content | `description`, `categoryId` | 分类删除可事务改指 |
| Time | `startAt`, `endAt` | unchanged；stage 不影响 |
| Priority | `importance`, `urgency` | 数据不变，仅编辑控件替换 |
| Processing | `stage` | new, non-null |
| Lifecycle | `status`, `trashedAt` | unchanged |
| Audit | `createdAt`, `updatedAt` | stage/分类改指时刷新 updatedAt |

### Invariants retained

- 仅标题必填且活跃标题不可重名。
- 已安排：`startAt` 与 `endAt` 均非空且 `endAt >= startAt`。
- 未安排：二者均为空；只进入“全部”视图。
- `importance`、`urgency` 均为 0～10 整数。
- `categoryId` 始终引用存在分类。
- status 仍为 active/completed/deleted；完成、删除、恢复与永久删除语义不变。

## 5. DerivedDaySection（非持久化）

日视图章节是前端由卡片区间、锚定日期和 owner timezone 推导的展示值。

```typescript
type DaySection = "due_today" | "in_progress" | "starting_today";
```

### Derivation precedence

1. `endAt` 落在锚定日 → `due_today`
2. `startAt` 早于锚定日且 `endAt` 晚于锚定日 → `in_progress`
3. `startAt` 落在锚定日 → `starting_today`

Rules:
- 日期区间采用 `[dayStart, nextDayStart)`。
- 同日开始结束命中第一条，不重复进入第三条。
- 输入只包含后端日视图返回的 active + scheduled + date-overlap 卡片。
- 每张输入卡必须恰好输出到一个章节；无法分类属于数据/边界错误，应在开发验证中暴露。

## 6. DerivedOverdueState（非持久化）

只在“全部”视图计算：

```text
overdue =
  card.status == "active"
  AND card.startAt != null
  AND card.endAt != null
  AND card.endAt < now
```

- 未安排、completed、deleted 均不显示过期红底。
- 该状态不写回数据库，也不改变 stage 或 lifecycle。

## 7. Relationships

```text
Category 1 <--- N ScheduleCard

DailyReport       (independent by date)

ScheduleCard.stage (independent of time and lifecycle)
```

删除 Category 时关系不会变为 null，而是将卡片外键重定向到系统 Category「无」。

## 8. Migration compatibility

| Migration | Existing data effect | Roll-forward validation |
|-----------|----------------------|-------------------------|
| 0006 daily reports | none | 表存在；date 主键；空表 |
| 0007 stage | 历史卡自动为 `not_started` | 0 条 null/非法 stage |
| 0008 none category | 系统化已有「无」或在缺失时新增，不改卡片引用 | `nameLower="无"` 恰好一条且 `isPreset=true` |

所有 migration 完成后运行 seed。seed 必须区分“全新数据库初始化”与“永久系统不变量”：首次初始化可创建「工作 / 个人 / 健康」，后续启动只永久幂等保证「无」，不得复活所有者已删除的分类。可用 owner preferences 是否尚未建立作为现有流程中的首次初始化信号。
