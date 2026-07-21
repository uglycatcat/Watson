# Data Model: 日程卡片组合与父卡片

**Feature**: `008-parent-card-compose`  
**Date**: 2026-07-21  
**Storage**: SQLite + Drizzle ORM

## 1. ScheduleCard 扩展（同表）

父卡片与标准卡片共用 `schedule_cards`。通过 `kind` 区分；子→父通过 `parentId` 表达。

### New / relevant fields

| Field | Storage | Required | Default | Rules |
|-------|---------|----------|---------|-------|
| `kind` | text | yes | `standard` | `standard` \| `parent` |
| `parentId` | text, FK → `schedule_cards.id`, nullable | no | `null` | 仅 `kind=standard` 可非空；指向 `kind=parent` 且 active 的父卡；一张子卡至多一个父 |
| `timeManual` | integer 0/1 | yes | `0` | 仅父卡有意义；`1` 表示用户手调过父卡时间 |
| `lastParentTitle` | text, nullable | no | `null` | 子卡 complete/delete 时写入当时父卡 title；restore 归回后清空 |
| `title` / `titleLower` | 既有 | yes | — | 父卡名称与标准标题共用活跃唯一（partial unique on `title_lower` where `status='active'`） |
| `startAt` / `endAt` | 既有 | 成对 | — | 父卡：包络或手调更宽；全子未安排则皆空 |
| `categoryId` | 既有 NOT NULL | yes | — | 父卡固定 `system-none` |
| `importance` / `urgency` | 既有 | yes | 5 | 父卡存默认，业务忽略 |
| `stage` | 既有 | yes | `not_started` | 父卡存默认，业务忽略 |
| `description` | 既有 | no | null | 父卡忽略 |
| `status` / `trashedAt` | 既有 | — | — | 父卡仅 `active`；清零时硬删，不进垃圾箱 |

### Indexes

- `idx_cards_parent_id` on `(parent_id)`
- 既有 `schedule_cards_title_lower_active_unique` 继续覆盖父卡名

### Migration

`0011_parent_cards.sql`：

```sql
ALTER TABLE schedule_cards ADD COLUMN kind text NOT NULL DEFAULT 'standard';
ALTER TABLE schedule_cards ADD COLUMN parent_id text REFERENCES schedule_cards(id);
ALTER TABLE schedule_cards ADD COLUMN time_manual integer NOT NULL DEFAULT 0;
ALTER TABLE schedule_cards ADD COLUMN last_parent_title text;
CREATE INDEX idx_cards_parent_id ON schedule_cards (parent_id);
```

历史行：全部为 `standard`、`parent_id=null`、`time_manual=0`、`last_parent_title=null`。

### Invariants

1. `kind=parent` ⇒ `parentId IS NULL`
2. `parentId IS NOT NULL` ⇒ `kind=standard` 且目标行 `kind=parent`
3. 禁止多层：父卡的 `parentId` 永为空
4. `kind=parent` ⇒ `categoryId = 'system-none'`
5. 活跃标题唯一：任意 active 的 standard.titleLower 与 parent.titleLower 互斥
6. 父卡时间（有已安排子时）：`startAt ≤ min(子.startAt)` 且 `endAt ≥ max(子.endAt)`，且起止成对非空
7. 父卡无已安排子 ⇒ `startAt`/`endAt` 皆空，`timeManual=0`

## 2. Relationships

```text
ParentCard (kind=parent)
    └── has many StandardCard (kind=standard, parentId = parent.id)
            └── at most one Parent

Trash StandardCard
    └── lastParentTitle?: string  (denormalized name for display / restore)
```

- 无独立 Membership 表。
- `childCount` 为查询派生，不持久化。

## 3. Lifecycle

### Standard card（相对本轮）

```text
independent --compose/add--> member of parent
member --detach--> independent
member --complete/delete--> trash (parentId cleared, lastParentTitle set)
trash --restore--> independent or member (via lastParentTitle resolve)
```

### Parent card

```text
(absent) --compose--> active parent
active --addChild/merge--> still active (child set changes)
active --last child leaves--> hard deleted (gone, not trash)
```

- 无 complete / soft / restore 路径。
- merge：源父硬删，子改挂目标父。

## 4. Time recompute state

```text
timeManual=0: parent.(start,end) := envelope(children) | (null,null)
timeManual=1: parent times kept; expand only if children break bounds
```

触发点见 [research.md](./research.md) R3。

## 5. View projection (derived, not stored)

| View | Top-level rows |
|------|----------------|
| all | parents + independent standards |
| week/month | scheduled parents + independent standards in range |
| day | standards in range (including members) |
| trash | trashed standards (+ lastParentTitle) |
| quadrant input | standards only (`kind=standard`) |

## 6. Validation summary

| Rule | Enforce at |
|------|------------|
| compose 两张独立 active 标准卡 | compose |
| 不可把已有 parentId 的卡再组合/加入 | compose / addChild |
| 父拖标准无效 | 前端禁止 + 无对应 API |
| 父名/标题 trim+lower 唯一 | assertTitleUnique |
| 父时间不窄于包络 | PATCH parent / compose 确认时间 |
| 清零硬删 | detach / complete / delete / merge 事务末 |
| restore 下划线消解撞名 | restore |
