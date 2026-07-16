# Research: 体验与视觉体系升级

**Feature**: `006-ux-visual-upgrade`  
**Date**: 2026-07-16

## R1 — 设计 Token 组织与 Tailwind 4 集成

**Decision**: 在 `frontend/src/index.css` 的 `:root` / `.dark` 内扩充 CSS 自定义属性；Tailwind 通过 `@theme` 映射常用 token（间距、圆角、阴影、字号），组件优先使用 `var(--*)` 或 Tailwind 语义类（如 `rounded-[var(--radius-md)]`），避免引入新 CSS-in-JS 库。

**Rationale**:
- 项目已用 CSS 变量驱动明暗主题（`--bg`、`--accent` 等），延续成本最低。
- Tailwind 4 `@import "tailwindcss"` 支持 `@theme inline { --color-accent: var(--accent); }` 桥接，减少 `style={{}}` 散落。
- 与用户约束「index.css 扩充 token」一致。

**Alternatives considered**:
- **独立 tokens.json + 构建脚本**：过度工程，本轮不需要跨平台导出。
- **全量 Tailwind 硬编码替换**：破坏主题切换与一致性，否决。

---

## R2 — Token 渐进迁移策略（避免回归）

**Decision**: 分 **4 波** 迁移，每波可独立验收与回滚：

| 波次 | 范围 | 验收焦点 |
|------|------|----------|
| Wave 0 | `index.css` token 定义 + `prefers-reduced-motion` 全局规则 + `@theme` 桥接 | 现有页无布局破坏 |
| Wave 1 | 壳层：`TopBar`、`Modal`、`Drawer`、`ChatPanel`、`LoginPage` | 导航、弹层、登录 |
| Wave 2 | 数据展示：`CardGrid`、`CardList`、`QuadrantView`、`WeekView`/`MonthView` 芯片 | 卡片、坐标、日历 |
| Wave 3 | 表单与杂项：`PriorityPicker`、`PinCodeInput`、`ConfirmDialog`、`GlobalSearch` | 创建/编辑/搜索 |

**规则**:
- 每改一个文件：仅替换视觉类名/token，**不改** props 契约、事件处理、Query key、API 调用参数。
- 保留旧类名并行一 commit 内完成单文件替换，禁止跨 10+ 文件的大爆炸 PR。
- 新组件（`EmptyState`、`Toast`、`Skeleton`、`PriorityMeter`）从第一天只消费 token。

**Rationale**: 006 风险主要在「全量替换导致视觉回归 + 行为误触」；按壳层→内容→表单递进，每波可对照 quickstart 子集回归 001～005。

**Alternatives considered**:
- **一次性全仓库替换**：回归面过大，否决。

---

## R3 — 动效统一与 `prefers-reduced-motion`

**Decision**:
- 定义 token：`--duration-fast: 150ms`、`--duration-normal: 200ms`、`--duration-slow: 250ms`、`--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`。
- 根节点 `html` 在主题切换时加 `transition: background-color, color var(--duration-normal) var(--ease-standard)`。
- 交互组件使用统一 utility 类 `.transition-interactive`（或 Tailwind `transition-colors duration-200`）。
- `Modal`/`Drawer`/`ChatPanel`：进入/退出用 opacity + translate（200ms）；`CompleteCheckbox` 勾选 scale 0.95→1（150ms）。
- 在 `index.css` 添加：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Rationale**: 满足 FR-002 / SC-002；单点全局 media query 兜底，避免每个组件遗漏。

**Alternatives considered**:
- **JS 检测 `matchMedia` 逐组件分支**：冗余，CSS 媒体查询足够。

---

## R4 — 优先级可视化组件形态

**Decision**: 新建 `PriorityMeter.tsx`（名称可定为 `PriorityMeter` / `PriorityBars`）：
- 横向 **强度条**：11 档刻度中填充 `value+1` 格（0～10 映射 0%～100% 宽度）。
- **颜色梯度**：`value` 映射 HSL 或 `color-mix` 从冷色（低）→ accent 色（高）；重要度与紧急度各一条，并排或上下叠放。
- **辅助数字**：`text-xs tabular-nums`，置于条右侧或下方，字号 `--text-xs`。
- 复用于：`CardGrid`、`CardList`、坐标 tooltip、`PriorityField` 按钮展示态（picker 弹出层仍用数字列表，展示态用 meter）。

**Rationale**: 与澄清「颜色梯度 + 强度条、数字辅助」一致；单组件保证卡片与表单一致。

**Alternatives considered**:
- **仅圆点条**：信息密度低，否决为主展示。
- **后端存颜色档位**：违反零后端约束，否决。

---

## R5 — 分类左缘色带（无后端色字段）

**Decision**: 新建 `lib/categoryColor.ts`：`getCategoryAccent(categoryId: string | null): string` 用稳定字符串 hash → HSL 色相（`hash % 360`），饱和度/亮度按主题固定；`categoryId` 为空时用 `var(--border)` 中性条。

**Rationale**: API 无 category 颜色字段；hash 保证同分类跨会话一致，纯前端可实现 FR-008。

**Alternatives considered**:
- **按 categoryName 上色**：重命名会导致色变，不如 id 稳定。
- **请求后端加 color 列**：违反 FR-017，否决。

---

## R6 — Toast 机制

**Decision**: `ToastProvider` + `useToast()` context；`ToastHost` portal 到 `document.body` 顶部居中或右上；单条自动消失 **3s**；连续成功 **替换** 当前条（不堆叠超过 1 条可见）。在 `useCardMutations` 各 `onSuccess` 注入 `toast.success(...)` — **仅增反馈文案，不改 mutationFn / invalidate 逻辑**。

**Rationale**: 满足 FR-013；集中管理避免各视图重复。

**Alternatives considered**:
- **第三方 toast 库**：依赖增量无必要，自建 <80 行可满足。

---

## R7 — Skeleton 与 EmptyState

**Decision**:
- `Skeleton`：`animate-pulse` 块 + `var(--border)` 底色，尊重 reduced-motion（pulse 在 media query 下禁用）。
- `EmptyState`：props `icon`（emoji 或 lucide-free SVG path）、`title`、`description`、`action?: { label, onClick }`。
- 各 View 在 `isLoading` → `Skeleton` 网格/列表；`!isLoading && items.length===0` → `EmptyState`。
- 搜索无结果：在 `AppShell` 搜索遮罩或 `GlobalSearch` 下拉内用 `EmptyState` 变体。

**Rationale**: 覆盖 FR-012/FR-014；图标级空状态满足澄清，不必插画。

---

## R8 — TopBar 三区与 Segmented Control

**Decision**:
- 布局：`grid grid-cols-[auto_1fr_auto]` 或 flex 三区：`left`（品牌 + 搜索 + 新建）、`center`（`SegmentedControl` 仅 day/week/month/all + `AnchorDateControl`）、`right`（操作区分组）。
- **`ViewTimeNav` 不迁入顶栏**，继续留在 Day/Week/Month 视图内（analyze 决策 A）。
- **垃圾箱不进 SegmentedControl**，为右侧独立入口（与 US4 语义分组一致）。
- 新建 `SegmentedControl.tsx`：泛型 `value` + `options[]`，容器 `background: var(--bg)` + `border-radius: var(--radius-md)`，选中项 `var(--accent-subtle)` 底 + `var(--accent)` 字色，非选中 `transparent`。
- 搜索：`GlobalSearch` 默认 `max-w-[200px]`，`:focus-within` 扩至 `max-w-md`，`transition: max-width 200ms`。
- 操作区：`| 垃圾箱 |` 分隔线 `|` 主题 + AI `|`；垃圾箱 drag-over 态沿用并增强 token（`--accent-subtle` 背景 + `outline`）。

**Rationale**: 直接对应 FR-003～006、FR-015；与现有 `TopBar` 行为 props 不变；避免把归档入口与日历视图切换混在同一分段控件。

**Alternatives considered**:
- **五段含垃圾箱**：与 US4「危险/归档 vs 偏好」分组冲突，否决。
- **ViewTimeNav 迁入 TopBar**：改动面大且与 005 视图内导航习惯不一致，本轮否决。

---

## R9 — QuadrantView 四象限升级

**Decision**: 在 SVG 内：
- 四块 `rect` 淡色填充（`:root` / `.dark` 各定义 `--quadrant-q1..q4`）。
- 角落 `text` 标签：右上「立即做」、左上「计划做」、右下「授权做」、左下「减少做」。
- 轴线 `strokeWidth={2}`，`stroke: var(--fg-muted-strong)`；原点 `(5,5)` 十字标记 + 小标签。
- 保留轴端「紧急度」「重要度」文案（替代原「紧急→」「↑重要」或并存）。
- Tooltip：portal 卡片式 `box-shadow: var(--shadow-md)`，列任务标题 + `PriorityMeter` 缩略。
- `cards.length <= 1`：图中央 overlay 轻量说明文案。

**Rationale**: FR-010/011；embedded 与 overlay 共用同一 `QuadrantPlot` 子组件避免分叉。

---

## R10 — 后端依赖评估

**Decision**: **本轮零后端改动**。已评估项：

| 需求 | 是否需后端 | 结论 |
|------|------------|------|
| 分类色带 | 否 | hash(categoryId) |
| 优先级可视化 | 否 | 已有 importance/urgency 0～10 |
| Toast / Skeleton / EmptyState | 否 | 纯 UI |
| 坐标图象限 | 否 | 纯 SVG |
| 主题 token | 否 | CSS |

**若 plan 外发现阻塞**：在 `tasks.md` 标 `[BLOCKED: needs backend]` 并暂停该子项，不擅自改 API。

---

## R11 — 回归验证策略

**Decision**: 每波迁移后执行 quickstart 对应章节 + 005 quickstart 全量抽检；重点自动化可选项（本轮不强制）：对 `CardGrid` 快照测试仅测「仍渲染 title」而非像素。

**人工回归矩阵**（最小）：

| 轮次 | 001 对话 | 002 手动 CRUD | 003 搜索编辑 | 004 优先级/垃圾箱/坐标 | 005 导航/拖拽/时间 |
|------|----------|---------------|--------------|------------------------|-------------------|
| Wave 1 后 | 登录 + AI 开合 | 创建弹层 | 搜索 | — | 顶栏日期/视图 |
| Wave 2 后 | — | 完成/删除 | — | 坐标/垃圾箱 | 拖拽进箱 |
| Wave 3 后 | — | 表单优先级 | 搜索空结果 | 恢复/永久删 | 时间规则 |

**Rationale**: 满足 FR-018 / SC-007。
