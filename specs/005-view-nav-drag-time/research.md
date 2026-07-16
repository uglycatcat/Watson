# Research: 视图导航、拖拽归档与时间模型收紧

**Feature**: `005-view-nav-drag-time`  
**Date**: 2026-07-16

## R-001: 时间规则校验落点（前端补齐 + 后端兜底）

**Decision**:
- **前端**（主 UX）：`CardFormFields` / `validateCardForm` / `formValuesToInput`
  - 去掉 `disabled={!values.startAt}` 与「填结束需先有开始」错误
  - 首次填开始（结束空）→ 本地结束 = 开始 + 24h
  - 改开始：仅当结束空或 &lt; 新开始时重补 +24h，否则保留（澄清 B）
  - 只填结束：提交时 `startAt = card.createdAt`（编辑）或省略 start 由后端对 create 填 `now`；`endAt` 为用户值
  - 皆空 → 提交 null/null（未安排）
- **后端**（权威兜底）：改写 `resolveTime` / create / update
  - 皆空 → 未安排
  - 仅 end → start = create 时 `nowIso()`，update 时用 `existing.createdAt`；校验 end ≥ start
  - 仅 start → end = start + 24h
  - 皆有 → end ≥ start，否则 400
  - 禁止持久化「有 start 无 end」

**Rationale**: 表单体验要即时反馈；后端防止绕过 API；与澄清一致。

**Alternatives considered**:

| 方案 | 拒绝原因 |
|------|----------|
| 仅前端校验 | 可被直接调 API 写入非法态 |
| 仅后端补齐、前端仍禁结束 | 违背「只填结束」UX |

---

## R-002: 历史「仅开始无结束」数据兼容

**Decision**: 增加 **数据-only** migration `0005_backfill_end_at.sql`：

```sql
UPDATE schedule_cards
SET end_at = datetime(start_at, '+1 day')  -- 或等价 ISO 拼接策略与 Node 一致
WHERE start_at IS NOT NULL AND end_at IS NULL;
```

SQLite 若存 ISO 字符串，优先在 migrate 脚本用 TS 读改写，或 SQL 能正确算则用 SQL。实现时与 `new Date(start).getTime()+86400000` 对齐。

**Rationale**: 一次性、可审计；无 schema 变更，符合「预期无新 migration（列级）」精神——仅 backfill。

**Alternatives considered**: 读时懒补齐——列表不一致风险；不做兜底——日历/校验失败。

---

## R-003: 拖拽删除实现与移动端降级

**Decision**:
- **桌面**：HTML5 Drag and Drop（`draggable` + `onDragStart` 带 `cardId`；垃圾箱 `onDragOver`/`onDrop`）
- Drop → 调用既有 `DELETE /api/cards/:id`（软删），**无** ConfirmDialog
- 来源：CardGrid 卡、周/月芯片、SpanBar（`dataTransfer.setData('application/x-watson-card', id)`）
- **触摸/移动端**：不实现触摸拖拽；依赖详情「删除」（仍二次确认）或完成方框；TopBar 可在 coarse pointer 下显示简短 title「桌面可拖入删除」

**Rationale**: 实现成本低；spec 允许降级；避免指针事件库依赖。

**Alternatives considered**: `@dnd-kit`——过重；触摸长按拖——本轮不做。

---

## R-004: 不可清空日期 + 回到今天

**Decision**:
- 新建 `AnchorDateControl`：受控 `value: string`（YYYY-MM-DD），`onChange` 仅在合法非空时触发
- 使用 `<input type="date">` 时：忽略/阻断 empty `onChange`；部分浏览器 clear 用 `if (!e.target.value) return`
- 旁路按钮「回到今天」→ `todayInTz` / `format` 今天
- `AppShell`：`anchorDate` 初始 today；禁止 set 为空
- TopBar：`view !== "trash"` 时显示（**含 all**）；trash 隐藏

**Rationale**: 最小改动修复清空缺陷；与周/日/月导航共用同一 anchor。

---

## R-005: 日视图左右布局

**Decision**:
- `DayView`：`flex` 行；左 `flex-1` CardGrid + ViewTimeNav；右固定宽（如 `min(320px, 40%)`）凹陷容器（`box-shadow: inset` / 深底）内嵌 `QuadrantView` 的 **embedded** 模式（无全屏遮罩，无点外围关闭，或关闭 noop）
- 移除日视图「坐标视图」按钮
- `AllView` 保持 overlay 按钮打开

**Rationale**: 复用 004 组件；改面局限 DayView + QuadrantView props。

---

## R-006: ViewTimeNav 抽象

**Decision**: 共享组件 props：`grain: 'day'|'week'|'month'`，`anchorDate`，`onDateChange`，`timezone`；内部用 date-fns `addDays`/`addWeeks`/`addMonths`。周视图可迁到该组件以统一文案（上一周/本周/下一周）。

---

## R-007: 周/月视觉常量

**Decision**:
- `LANE_HEIGHT`：约 22 → **55**（×2.5）
- SpanBar `topOffset` 再 +4～8px「顶端略下移」
- Week/Month 容器增加 `pb-6`～`pb-10` 底留白；月网格 `max-height` 或 flex 收缩避免贴底

**Rationale**: 目视达标；注意拥挤修复——单元格内 `overflow-y-auto` 保留。

---

## R-008: 宪法 IV 措辞

**Decision**: 已修订宪法 **v1.3.1**：已安排 = 起止皆有；禁止仅开始无结束持久态。analyze C1 关闭。
