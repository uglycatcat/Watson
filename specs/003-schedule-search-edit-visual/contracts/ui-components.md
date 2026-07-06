# UI Components: 003 前端交互契约

**Feature**: `003-schedule-search-edit-visual`  
**Date**: 2026-07-06

## GlobalSearch（TopBar 内嵌或子组件）

**路径（计划）**: `frontend/src/components/search/GlobalSearch.tsx`

| 属性 / 行为 | 说明 |
|-------------|------|
| 触发 | TopBar 搜索 input |
| 聚焦 | `onFocus` → AppShell `searchFocused=true` → main overlay 变暗 |
| 输入 | debounce 可选（≤50ms）；调用 `searchTitles(cards, query)` |
| 下拉 | 最多 8 条；相关度序；无匹配显示「无匹配」 |
| 选择 | `onSelect(card)` → 打开 CardDetailModal |
| 关闭 | Escape / blur → 收起下拉 + 恢复亮度 |

**依赖**: `titleSearch.ts` 纯函数（可 Vitest 单测）

---

## CardDetailModal（扩展）

**路径**: `frontend/src/components/cards/CardDetailModal.tsx`

| 模式 | UI | 操作 |
|------|-----|------|
| `view` | `<dl>` 只读（002） | 编辑、删除、关闭 |
| `edit` | `CardFormFields` | 保存、取消 |

**保存**: `validateCardForm` → `updateCard` → 成功回 `view` + invalidate  
**取消**: 丢弃 draft → `view`  
**无时间展示**: timeNature 为空时显示「无时间」

---

## CardFormFields / validateCardForm（共享）

**路径**: `frontend/src/components/cards/CardFormFields.tsx`

| 规则 | 行为 |
|------|------|
| 标题 | 必填 |
| 无时间 | timeNature 未选 + 时间字段空 → 合法 |
| 部分时间 | timeNature 已选但未填齐 → 错误 |
| Enter | 仅 CreateCardModal 标题框；`compositionstart/end` _guard |
| 409 | 展示 API 重名错误 |

**timeNature UI**: 可选「不设置时间」或清空选择 → null

---

## CardGrid

**路径（计划）**: `frontend/src/components/ScheduleViews/CardGrid.tsx`

| 属性 | 说明 |
|------|------|
| `cards` | ScheduleCard[] |
| `onCardClick` | 打开详情 |
| 布局 | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`（自适应） |
| 卡片样式 | `rounded-lg border p-3` 圆角矩形 |

**用于**: DayView, AllView

---

## AllView 筛选栏

**路径**: `frontend/src/components/ScheduleViews/AllView.tsx`

| 控件 | 绑定 query |
|------|------------|
| 分类 | `categoryId` |
| 重要度 | `importance` |
| 紧急度 | `urgency` |
| 时间性质 | `timeNature` |
| 有无时间 | `hasTime` |
| 排序 | `sort` |

组合 AND；清除重置；空列表空状态。

---

## AppShell 搜索 overlay

**路径**: `frontend/src/layouts/AppShell.tsx`

```text
main (relative flex-1 min-h-0)
  ├── overlay (absolute inset-0 bg-black/40 pointer-events-none)  // searchFocused
  └── ScheduleViewRouter (z-10)
```

**布局链**: `flex flex-col h-screen` → main `flex-1 min-h-0 overflow-auto`（Week/Month 全屏前提）

---

## ChatPanel

**路径**: `frontend/src/components/ChatPanel/ChatPanel.tsx`

| 003 移除 | 说明 |
|----------|------|
| `affectedCards` invalidate | 不再刷新 cards query |

Placeholder 更新为通用聊天（非「用自然语言管理日程」）。

---

## 主题变量

**路径**: `frontend/src/index.css`

| 主题 | `--accent` |
|------|------------|
| light | `#2563eb` |
| dark | `#76b900` |

组件 SHOULD 使用 `var(--accent)` 或 theme 映射，避免硬编码 `#2563eb` / `#569cd6`。

---

## WeekView / MonthView 全屏

| 视图 | 容器 class 意图 |
|------|-----------------|
| WeekView | 根 `flex flex-1 gap-2 min-h-0 h-full`；列 `flex-1 flex flex-col rounded-lg border min-h-0` |
| MonthView | 根 `flex flex-col flex-1 min-h-0 h-full`；grid `flex-1 grid grid-cols-7 grid-rows-6` |

002 的 SpanBar、DayScheduleDrawer、+N 更多 **保留**。
