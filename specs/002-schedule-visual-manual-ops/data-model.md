# Data Model: 日程可视化与手动操作增强

**Feature**: `002-schedule-visual-manual-ops`  
**Date**: 2026-07-06  
**Storage**: 无 SQLite 变更；本文档描述 **UI 状态**与**客户端偏好**

## 服务端实体（不变）

本特性 **不修改** 001 定义的 `schedule_cards`、`categories`、`owner_preferences` 表结构。

引用：[specs/001-conversational-scheduling/data-model.md](../001-conversational-scheduling/data-model.md)

### owner_preferences 使用说明（只读/写入行为变化）

| 字段 | 002 行为 |
|------|----------|
| `theme` | 前端仅 PATCH `light` \| `dark`；读取到 `system` 时 UI 当作 `light` |
| `timezone` | 前端日历网格读取，默认 `Asia/Shanghai` |
| `dueSoonDays` | 不变 |

---

## 客户端偏好（新增，非 API）

### LocalStorage

| Key | Type | Default | 说明 |
|-----|------|---------|------|
| `watson:chatPanelWidth` | `number` (px) | `384` | AI 助手栏宽度；仅本设备 |

**Validation**: 整数；clamp `[280, min(560, 0.45 * viewportWidth)]`

### SessionStorage

| Key | Type | Default | 说明 |
|-----|------|---------|------|
| `watson:chatOpen` | `"1"` \| `"0"` | `"1"` | 助手栏显隐；关闭浏览器后重置 |

---

## UI 状态实体（非持久）

### ScheduleViewContext（扩展）

在 001 视图模式基础上，前端 React state：

| 字段 | Type | 视图 | 说明 |
|------|------|------|------|
| `view` | `day \| week \| month \| all` | 全局 | TopBar 控制 |
| `anchorDate` | `YYYY-MM-DD` | day/week/month | TZ-aware 今日 |
| `monthDrawerDate` | `YYYY-MM-DD \| null` | month | 日抽屉打开时指向的日期 |
| `selectedCardId` | `UUID \| null` | 全局 | 详情 Modal 打开 |
| `createModalOpen` | `boolean` | 全局 | 手动创建 Modal |

### DayScheduleDrawer

| 属性 | 说明 |
|------|------|
| `date` | 所展示日历日 |
| `cards` | 该日全部 ScheduleCard（客户端过滤或 day query） |
| `onClose` | 关闭后 `monthDrawerDate = null` |

### CardDetailModal

| 属性 | 说明 |
|------|------|
| `card` | ScheduleCard 完整 DTO |
| `confirmDeleteOpen` | 二次确认子状态 |
| `onDeleted` | 关闭 modal + invalidate cards |

### CreateCardModal / CardFormDraft

| 字段 | 必填 | 默认 | 映射 API |
|------|------|------|----------|
| `title` | ✅ | — | `title` |
| `timeNature` | ✅ | `duration` | `timeNature` |
| `startAt` | duration ✅ | — | ISO8601 |
| `endAt` | duration ✅ | start+1h | ISO8601 |
| `deadlineAt` | deadline ✅ | — | ISO8601 |
| `importance` | — | `medium` | `importance` |
| `urgency` | — | `medium` | `urgency` |
| `categoryId` | — | 默认「个人」 | `categoryId` |
| `description` | — | `null` | 若 API 支持（001 body 无 description 则省略） |

> **Note**: 001 `ScheduleCardInput` OpenAPI 含 `title, timeNature, startAt, endAt, deadlineAt, importance, urgency, categoryId, categoryName`；若后端 create 已支持 `description` 则表单可选填，否则隐藏该字段。

### CalendarGrid（计算结构，非存储）

**MonthGrid**:

```text
MonthGrid
├── timezone: string
├── weeks: WeekRow[]
│   └── days: DayCell[7]
│       ├── date: YYYY-MM-DD
│       ├── inMonth: boolean
│       └── isToday: boolean
└── spanBars: SpanBar[]
    ├── cardId
    ├── title
    ├── weekIndex, lane
    ├── startCol, endCol  (0-6, Mon-Sun)
    └── clipStart, clipEnd  (跨月/跨周 clip)
```

**SpanBar 归属规则**:
- `duration`：覆盖日区间内每一天；跨度 >1 天 → 条带层
- `deadline`：仅 deadline 日 → cell chip
- 排序：priorityScore 降序（与 001 一致）

---

## 状态转换

```text
[卡片点击] → selectedCardId 设置 → CardDetailModal open
[删除确认] → DELETE API → selectedCardId null → invalidate cards
[+ 点击] → createModalOpen true
[提交创建] → POST API → createModalOpen false → invalidate cards
[月格 +N] → monthDrawerDate = date → DayScheduleDrawer open
[Drawer 内点卡片] → CardDetailModal open（Drawer 保持）
[关闭 Modal] → selectedCardId null（Drawer 不变）
```

---

## API 实体映射（无新 DTO）

继续使用 001 `ScheduleCard` JSON 形状；详见 [contracts/api-usage.md](./contracts/api-usage.md)。
