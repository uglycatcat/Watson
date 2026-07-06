# UI Components Contract: 002 前端交互

**Feature**: `002-schedule-visual-manual-ops`  
**Date**: 2026-07-06

本文档定义前端组件对外行为（非 REST）。实现 MUST 满足 spec.md 与 clarify 结论。

---

## 布局

### AppShell

| 行为 | 要求 |
|------|------|
| 结构 | TopBar + flex(main, aside?) |
| chatOpen=false | aside 不渲染；main flex-1 全宽 |
| chatOpen=true | aside 宽度 = localStorage 或默认 384px |
| 分隔条 | main 与 aside 之间；pointer 拖拽调宽 |

### TopBar

| 控件 | 行为 |
|------|------|
| 侧栏开关 | 全断点可见；toggle sessionStorage chatOpen |
| 主题按钮 | light ↔ dark 二态（无 system） |
| 「+」 | 打开 CreateCardModal |
| 视图/日期 | 与 001 相同，驱动 ScheduleViewRouter |

---

## ui/Modal

```text
Props: open, onClose, title?, children, className?
```

| 行为 | 要求 |
|------|------|
| 渲染 | Portal 至 body；遮罩 + 居中面板 |
| 关闭 | Esc、遮罩点击、显式关闭按钮 |
| 堆叠 | 允许 Drawer 之上再开 Modal（月视图场景） |

**用于**: CardDetailModal, CreateCardModal

---

## ui/Drawer

```text
Props: open, onClose, side: "left" | "right", title?, children
```

| 行为 | 要求 |
|------|------|
| 动画 | 滑入/滑出 |
| DayScheduleDrawer | side=left；列出单日全部卡片 |

---

## ui/ConfirmDialog

```text
Props: open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel
```

| 行为 | 要求 |
|------|------|
| 删除文案 | MUST 含卡片 title，如「确定删除「{title}」吗？」 |
| 取消 | 不调用 DELETE |

---

## CardDetailModal

| 展示字段 | title, timeNature, 时间字段, importance, urgency, categoryName, description? |
| 操作 | 删除 → ConfirmDialog → DELETE API |
| 关闭 | 回到触发视图；不关闭 DayScheduleDrawer |

---

## CreateCardModal + CardFormFields

| 字段 | 控件 |
|------|------|
| title | text input |
| timeNature | radio: duration / deadline |
| 时间 | datetime-local 或 date+time（实现自选，提交 ISO8601） |
| importance, urgency | select: high/medium/low |
| categoryId | select from categories |

| 校验 | 与 001 后端一致 |
| 提交 | POST /api/cards；loading/disabled 态 |

---

## MonthView

| 区域 | 行为 |
|------|------|
| 网格 | 6×7 典型；周一始；非本月日期灰显 |
| 格内 | ≤3 chip +「+N 更多」 |
| 跨日 duration | SpanBar 跨格；标题在起始格 |
| 点击格/+N | 打开 DayScheduleDrawer |
| 点击 chip/条带 | 打开 CardDetailModal |

---

## WeekView

| 区域 | 行为 |
|------|------|
| 布局 | 7 列 Mon–Sun |
| 跨日 | SpanBar 跨列 |
| 空列 | 「无安排」 |
| 导航 | 上一周 / 下一周 / 本周 |

---

## DayView / AllView

| 行为 | 要求 |
|------|------|
| 列表 | CardList 可点击 |
| 空状态 | 明确文案 |
| AllView | 保留 sort/importance 筛选 |

---

## hooks

### useTheme

- 导出: `{ theme: "light"|"dark", toggleTheme }`
- 读取 system → 显示 light

### useChatPanelLayout

- 导出: `{ chatOpen, toggleChat, width, onResizeStart }`
- width 持久 localStorage；chatOpen 持久 sessionStorage

### useCardMutations

- 导出: `{ createCard, deleteCard, isCreating, isDeleting }`
- 成功 invalidate `["cards"]`

---

## 可复用性

| 组件 | 复用方 |
|------|--------|
| ui/Modal | 详情、创建 |
| ui/ConfirmDialog | 详情删除 |
| ui/Drawer | 月视图日列表 |
| CardFormFields | 仅 CreateCardModal（未来编辑可复用，002 不在范围） |
| calendar/* utils | MonthView, WeekView |
