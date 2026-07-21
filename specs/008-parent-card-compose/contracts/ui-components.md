# UI Component Contract: Watson 008 Parent Cards

**Feature**: `008-parent-card-compose`  
**Applies to**: React frontend

## 1. CardGrid — 父卡外观与组合 Drop

### Parent card branch（`kind === "parent"`）

必须渲染：
- 堆叠影（伪元素错位描边；明/暗各一套 token）
- 右上角计数徽章：`childCount`（accent-subtle 底 + 强调色）
- 标题与时间（已/未安排样式与标准卡分段一致）

必须**不**渲染：
- 优先级条、分类色带、阶段徽章、完成框、hover 顶条（若与堆叠冲突可省略）

判定：以 `card.kind === "parent"` 为准，不用启发式。

### Compose drop（仅 AllView 传入 `enableComposeDrop`）

| 拖起 \ 落点 | 行为 |
|-------------|------|
| 标准 → 标准（双方独立） | 打开 CreateParentModal |
| 标准 → 父 | `addChild`（无确认框） |
| 父 → 父 | `mergeParents` |
| 父 → 标准 | 禁止态，不调用 API |
| 任意 → TopBar 垃圾箱 | **不在本组件处理**；既有删除 |

反馈阶段（受 `prefers-reduced-motion`）：
1. 拖起浮动  
2. 有效目标高亮；悬停父卡时徽章预览 +1；无效禁止态  
3. 松手 fly-to 收拢  
4. 落定轻量 toast  

MIME 继续 `application/x-watson-card`（见 `dnd/dragTrash.ts`）。

### Click

- 父卡点击 → 打开 `ParentCardDetailModal`（非标准 CardDetailModal）。
- 标准卡点击 → 既有详情。

---

## 2. CreateParentModal

复用 `Modal`。

### Fields

- 名称：必填；失焦/提交就地红字（空、trim+lower 与活跃重名）
- 时间：默认包络（由调用方传入两卡计算或留空等服务端）；可手改；提交前本地校验不窄于包络（最终以后端为准）
- 待纳入列表：只读展示两张卡标题
- 取消 / 确认

确认 → `POST /api/cards/compose`；成功关闭并 invalidate `["cards"]`。

---

## 3. ParentCardDetailModal

### 打开入口

- 全部/周/月：点击父卡
- 日视图：点击子卡折页角标

同一组件；`cardId` 为父卡 id；打开时 `GET /api/cards/:id` 取 `children`。

### 上区 — 父卡编辑

沿用标准详情「点击即编辑、确认/恢复、点外部关闭、就地红字」：
- 名称：唯一性就地校验
- 时间：违反包络就地红字，不提交
- **无** 完成、删除、优先级、分类、阶段控件

### 下区 — 迷你子卡网格

- 比正常卡小一号；无折页角标；按 `createdAt` 升序（与 API children 一致）
- 拖出下区边界并释放 → `POST /api/cards/:childId/detach`
- 释放区边界高亮

---

## 4. DayView — 折页角标

- 对 `parentId != null` 的标准卡，在卡片右下角渲染可点击折页。
- `z-index` 低于完成框，不遮挡点击完成。
- hover：`title`/`aria` 提示 `parentTitle`。
- 点击折页：打开父详情；点击卡片其余区域：仍打开标准详情。
- `buildDaySections` **不**读 parentId；分区只按子卡自身时间。

---

## 5. AllView

- `buildAllSections`：父卡与独立标准卡按自身 `startAt&&endAt` 入已安排/未安排段（与第七轮一致）。
- 向 CardGrid 开启 `enableComposeDrop`。
- 内嵌 QuadrantView：过滤掉 `kind=parent`（若 all 列表含父卡）。

---

## 6. WeekView / MonthView / SpanBar

- 数据源已无子卡；父卡按 `startAt`/`endAt` 进网格。
- 跨天沿用 SpanBar；点击父卡条 → ParentCardDetailModal。
- 不渲染折页（子卡不出现）。

---

## 7. TrashView

- 展示 `lastParentTitle`（有则标注「原属：…」）。
- 不渲染父卡行。
- 恢复走既有 restore；后端处理归回/重建。

---

## 8. QuadrantView

- 输入卡片：`items.filter(c => c.kind !== "parent")`。
- 子卡（有 parentId）仍按其 importance/urgency 定位。
- 无父卡圆点或特殊标记。

---

## 9. TopBar

- 垃圾箱 drop 目标与 `deleteCard` 行为**不变**。
- 不在 TopBar 处理组合。

---

## 10. Motion / theme

- 动效 token 对齐 006/007；`prefers-reduced-motion: reduce` 时跳过 fly-to/弹跳，保留即时状态切换与 toast。
- 深色主题堆叠影与折页对比度可读（具体色值实现阶段定，须过明暗目视）。
