# Data Model: 视图导航、拖拽归档与时间模型收紧

**Feature**: `005-view-nav-drag-time`  
**Date**: 2026-07-16  
**Storage**: SQLite `schedule_cards` **无新列**；可选数据 backfill

## schedule_cards（相对 004）

| 字段 | 004 | 005 |
|------|-----|-----|
| `start_at` / `end_at` | 已安排可仅 start | **已安排二者皆非 NULL** |
| `status` / `trashed_at` | 不变 | 拖拽删除 → deleted + trashed_at（同软删） |
| 其余 | 不变 | — |

### 时间合法态（权威）

```
未安排: start_at IS NULL AND end_at IS NULL
已安排: start_at IS NOT NULL AND end_at IS NOT NULL AND end_at >= start_at
非法:   仅一端有值（持久化禁止；入站由 resolveTime 补齐或 400）
非法:   end_at < start_at
```

### resolveTime / 入站补齐

| 入站 | 结果 |
|------|------|
| start null, end null | 未安排 |
| start null, end set | start = create→now / update→createdAt；须 end ≥ start |
| start set, end null | end = start + 24h |
| start set, end set | 校验 end ≥ start |

### Backfill（可选 0005）

```
WHERE start_at IS NOT NULL AND end_at IS NULL
SET end_at = start_at + 24 hours
```

### 标题唯一 / 生命周期

沿用 004：仅 active 唯一；complete / soft-delete / restore / permanent 不变。

---

## API DTO

无破坏性字段增减。语义变化：

- create/update 不再接受「有 start 无 end」持久结果（自动补或 400）
- create 仅 end：服务端写 start=now
- update 仅 end：服务端写 start=createdAt（若原未安排）

`scheduled` 过滤：建议改为 `startAt != null AND endAt != null`（与已安排定义对齐）。

---

## UI 状态（非持久）

### AnchorDate

| 字段 | 说明 |
|------|------|
| value | YYYY-MM-DD，永不 null/空 |
| today action | 重置为时区今天 |

### ViewTimeNav

| grain | 前一 / 当前 / 后一 |
|-------|-------------------|
| day | -1d / 今天 / +1d |
| week | -1w / 本周 / +1w |
| month | -1M / 本月 / +1M |

### DragTrashSession

| 字段 | 说明 |
|------|------|
| draggingCardId | string \| null |
| overTrash | boolean（高亮投放区） |

### DayViewLayout

| 区域 | 内容 |
|------|------|
| left | ViewTimeNav + CardGrid |
| right | inset 方框 + QuadrantView embedded |

---

## 实体关系（概念）

```text
AnchorDate ──导航──► Day/Week/Month views
ScheduleCard ──drag──► Trash drop ──softDelete──► status=deleted
ScheduleCard.time ──三种互斥──► unscheduled | scheduled(interval)
```
