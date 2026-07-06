# Implementation Plan: 日程可视化与手动操作增强

**Branch**: `002-schedule-visual-manual-ops` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-schedule-visual-manual-ops/spec.md`  
**User constraints**（来自 setup.md）: 在现有技术栈上做**纯前端交互增强**；Fastify + SQLite/Drizzle 后端，React 19 + Vite + Tailwind + TanStack Query 前端，单端口部署；**预期后端零改动**。

## Summary

本特性在 001 已实现的后端 CRUD 与四视图 API 之上，重构 **MonthView / WeekView** 为真实日历网格（含跨日/跨格条带），补齐 **卡片详情模态**、**手动创建表单**、**顶部 AI 侧栏开关**与 **可拖拽调宽**；收敛主题为 **light | dark** 二态。

技术路径：**不新增后端路由与 schema**；前端扩展 `api.ts` mutation、新建轻量 `ui/` 基元（Modal / Drawer / ConfirmDialog）、`calendar/` 工具（date-fns + date-fns-tz，时区取自 `GET /api/preferences.timezone`）；助手栏宽度存 **localStorage**，显隐存 **sessionStorage**（与 spec 澄清一致）。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x（与 001 相同）

**Primary Dependencies**（本特性新增/重点使用）:
- Frontend: `date-fns`, `date-fns-tz`（日历网格与日界线）；现有 TanStack Query、Tailwind 4
- Backend: **无新增依赖**

**Storage**:
- 服务端：无变更（SQLite schema 不变；`owner_preferences.theme` 仍允许 DB 存 `system`，由前端归一化）
- 客户端：`localStorage`（`watson:chatPanelWidth`）、`sessionStorage`（`watson:chatOpen`）

**Testing**: Vitest + RTL（前端组件/钩子）；现有 node:test 后端套件无需扩展（零后端改动）

**Target Platform**: 浏览器（Chrome/Safari/Firefox 最近两版）；响应式桌面 + 移动

**Project Type**: Web application monorepo（`backend/` + `frontend/`）

**Performance Goals**:
- 月视图网格首屏渲染（≤200 张卡片）< 100ms（客户端分组，无额外 API）
- 拖拽调宽 60fps（`requestAnimationFrame` + CSS 变量）
- 详情/创建模态打开 < 16ms（无重型依赖）

**Constraints**:
- **后端零改动**为默认目标；主题 `system` 归一化、日历 TZ 边界均在客户端完成
- 跨日条带布局允许简化 lane 算法（同格最多 3 条可见 + 折叠），与 spec 一致
- 不引入 FullCalendar / shadcn 全量安装（001 plan 提及 shadcn 但未落地；本特性自建最小 Modal/Drawer）

**Scale/Scope**: 单用户；月视图单格 ≤3 摘要 +「+N」；条带 lane ≤4；改动约 15–20 个前端文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (Watson v1.0.0)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth design | 新 UI 入口均在已登录 AppShell 内；create/delete 走既有鉴权 API | ✅ 无新公开端点 | ✅ contracts 声明复用 session |
| II. 密钥外置 | Secrets handling | 无新密钥；localStorage 仅存布局偏好 | ✅ | ✅ |
| III. AI 可插拔 | LLM abstraction | 不修改 LLM 层 | ✅ | ✅ |
| IV. 日程卡片核心 | Data model | 手动表单/详情读写 ScheduleCard 字段；不增字段 | ✅ | ✅ data-model UI 层 |
| V. 多设备一致 | Client strategy | 核心 CRUD 仍经同一 API；布局偏好本机/会话级为 spec 明确例外 | ✅ FR-011 澄清 | ✅ |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation (this feature)

```text
specs/002-schedule-visual-manual-ops/
├── plan.md              # 本文件
├── research.md          # Phase 0 — 技术决策
├── data-model.md        # Phase 1 — UI 状态与客户端偏好
├── quickstart.md        # Phase 1 — 验收指南
├── contracts/
│   ├── api-usage.md     # 既有 REST 用法（无 OpenAPI 变更）
│   └── ui-components.md # 前端组件交互契约
└── tasks.md             # Phase 2 (/speckit-tasks，尚未生成)
```

### Source Code（本特性改动范围）

```text
watson/
├── backend/                    # 【无改动】
└── frontend/src/
    ├── layouts/AppShell.tsx    # 侧栏宽度 state、分隔条、sessionStorage chatOpen
    ├── components/
    │   ├── TopBar/TopBar.tsx   # 侧栏开关（全端）、「+」创建入口
    │   ├── ui/                 # 【新建】Modal, Drawer, ConfirmDialog, ResizeHandle
    │   ├── cards/              # 【新建】CardDetailModal, CreateCardModal, CardFormFields
    │   ├── ScheduleViews/
    │   │   ├── MonthView.tsx   # 日历网格 + DayDrawer + 跨格条带
    │   │   ├── WeekView.tsx    # 七列 + 跨列条带
    │   │   ├── DayView.tsx     # 列表 + 点击开详情
    │   │   ├── AllView.tsx     # 列表 + 点击开详情
    │   │   └── CardList.tsx    # 可点击卡片行
    │   └── calendar/           # 【新建】grid utils, span layout, tz helpers
    ├── hooks/
    │   ├── useTheme.ts         # light/dark 二态；system→light 归一化
    │   ├── useChatPanelLayout.ts # 【新建】宽度拖拽 + 持久化
    │   └── useCardMutations.ts # 【新建】create/delete + invalidate
    └── lib/api.ts              # createCard, deleteCard, getCardById
```

**Structure Decision**: 延续 001 monorepo；本特性**仅 `frontend/src`** 有代码变更。文档契约说明如何消费既有 `/api/cards` 等端点，OpenAPI 文件不复制变更（见 `contracts/api-usage.md`）。

## Implementation Phases

### Phase A — 基础设施（P6 主题 + P5 侧栏 + UI 基元）

1. **`useTheme` 改造**
   - 类型收敛为 `"light" | "dark"`；`toggleTheme()` 二态切换（替换 `cycleTheme` 三态）
   - 读取 `prefs.theme === "system"` 时归一化为 `"light"` 应用 DOM，**不向 PATCH 写回**（除非用户主动切换，此时写 `light`/`dark`）
   - TopBar 图标/文案随二态更新

2. **`useChatPanelLayout` + AppShell**
   - `sessionStorage` 键 `watson:chatOpen`：`"1"`/`"0"`，缺省 `true`（新会话默认显示，符合 FR-011）
   - `localStorage` 键 `watson:chatPanelWidth`：像素整数，默认 `384`，clamp `[280, min(560, floor(viewport*0.45))]`
   - 主区域 `min-width: 320px`（SC-005 约 25% 增益在默认宽度下可满足）
   - `ResizeHandle`：`pointerdown` → document 级 `pointermove/up`，拖拽时 `user-select: none`

3. **TopBar**
   - 侧栏开关：**所有断点可见**（移除 `md:hidden` 限制）
   - 「+」按钮 → 打开 `CreateCardModal`

4. **`ui/Modal` / `ui/Drawer` / `ui/ConfirmDialog`**
   - Portal 到 `document.body`；Esc / 遮罩关闭；focus trap 简化版
   - Modal 居中；Drawer 从主区左缘或右缘滑入（月视图日列表用 **左缘 Drawer**，与右侧 AI 栏区分）

### Phase B — 卡片详情与变更（P1）

1. **`api.ts`**: `createCard(body)`, `deleteCard(id)`, `getCardById(id)`（可选，详情可直接用列表数据）
2. **`useCardMutations`**: `useMutation` + `onSuccess` → `invalidateQueries({ queryKey: ["cards"] })`
3. **`CardDetailModal`**: 展示全部字段；删除 → `ConfirmDialog`（文案含标题）→ `DELETE /api/cards/:id`
4. **各视图**：CardList / 网格单元 / 条带 `onClick` → 打开 `CardDetailModal`；月 DayDrawer 内点击 → Modal 叠层（spec Edge Case）

### Phase C — 手动创建（P4）

1. **`CreateCardModal` + `CardFormFields`**
   - 字段：title, timeNature, startAt/endAt 或 deadlineAt, importance, urgency, categoryId, description?
   - 分类：`useQuery(["categories"])` 下拉
   - 默认值：importance/urgency=`medium`；category 默认「个人」或第一项
   - 客户端校验对齐后端 Zod（持续型 end>start；必填 title）
   - 提交 `POST /api/cards` → 关闭 modal → invalidate

### Phase D — 月视图网格（P2）

1. **`calendar/monthGrid.ts`**
   - 输入：`anchorDate`（YYYY-MM-DD）、`timezone`（来自 preferences，默认 `Asia/Shanghai`）
   - 输出：`WeekRow[]`，每行 7 个 `DayCell { date, inMonth, isToday }`
   - 使用 `date-fns-tz`: `toZonedTime`, `formatInTimeZone`；周起始 **周一**（`weekStartsOn: 1`）
   - 月历可见范围：含补齐首尾周的完整格子（6 行典型）

2. **卡片归日**
   - `duration`：展开 `[startAt, endAt]` 覆盖的每个日历日（TZ 下 YYYY-MM-DD）
   - `deadline`：落在 `deadlineAt` 所在日
   - 单日截止/短事件：格内 **chip 列表**；按 priority 排序，**最多 3** +「+N 更多」

3. **跨格条带层**
   - 对 `duration` 且跨度 >1 天的卡片：在网格上方绝对定位层渲染 `SpanBar`（gridColumn 起止按 cell 索引）
   - 同周同行 lane 分配（贪心）；标题仅在起始格显示
   - 跨月：按 spec 在当前月网格 clip 可见段（切换月份时 API 重新拉取）

4. **`DayScheduleDrawer`**
   - 点击日期格或「+N」→ 打开 Drawer，列表该日全部卡片（客户端 `cardsForDay` 过滤，或 `view=day&date=` 二次请求——**优先客户端过滤**以减少请求）

### Phase E — 周视图（P3）

1. **`calendar/weekGrid.ts`**：锚定周 seven columns Mon–Sun（TZ 一致）
2. 单日卡片：列内 chip；跨日 `duration`：**跨列条带**（与月视图同 lane 算法，横向 7 列）
3. 跨周边界：条带从本周首日 clip 至 `endAt` 所在列
4. 周导航：TopBar 已有 date picker；补充「上一周 / 下一周 / 本周」快捷（或在 WeekView 内工具栏）

### Phase F — DayView / AllView 收尾

- 保留 `CardList`；增加 `onCardClick`；空状态文案
- AllView 筛选能力保持（可选：补 urgency/timeNature 筛选 UI，非必须）

## Frontend / Backend Change Matrix

| 能力 | 层级 | 改动 |
|------|------|------|
| 主题 light/dark | 纯前端 | `useTheme.ts`, TopBar |
| 侧栏显隐 | 纯前端 | AppShell, TopBar, sessionStorage |
| 侧栏宽度 | 纯前端 | AppShell, ResizeHandle, localStorage |
| 月/周网格 | 纯前端 | MonthView, WeekView, calendar/* |
| 日抽屉 | 纯前端 | DayScheduleDrawer |
| 详情/删除 | 前端 + **既有 API** | CardDetailModal, DELETE /api/cards/:id |
| 手动创建 | 前端 + **既有 API** | CreateCardModal, POST /api/cards |
| 卡片列表 | **无改动** | GET /api/cards 参数不变 |
| preferences | **无改动** | PATCH theme 仍接受 light/dark（前端不再发 system） |
| SQLite schema | **无改动** | — |
| OpenAPI | **无改动** | 引用 001 `openapi.yaml` |

### 可选后端增强（**非本特性范围**，文档记录）

| 项 | 说明 | 为何 defer |
|----|------|------------|
| `rangeForView` 读 `owner_preferences.timezone` | 服务端日/周/月边界与 TZ 对齐 | 前端用 TZ 归日 + 月范围 API 结果即可；边界偏差在单 TZ 部署下可接受 |
| GET preferences 归一化 `system→light` | 防御性 | 前端已归一化，满足 FR-013 |

## Complexity Tracking

> 无宪法违规需论证。布局偏好本机/会话级为 spec 明确例外，不违反原则 V「核心能力同 API」。

| 决策 | 说明 |
|------|------|
| 不引入 shadcn 全量 | 001 未落地；自建 3 个 ui 基元更轻 |
| 月视图条带 lane 贪心 | 满足 spec 语义，非 Google Calendar 级完美堆叠 |
| sessionStorage 显隐 | spec 澄清 B；与宽度 localStorage 分离 |

## Phase 0 / Phase 1 Artifacts

| 文件 | 状态 |
|------|------|
| [research.md](./research.md) | ✅ |
| [data-model.md](./data-model.md) | ✅ |
| [quickstart.md](./quickstart.md) | ✅ |
| [contracts/api-usage.md](./contracts/api-usage.md) | ✅ |
| [contracts/ui-components.md](./contracts/ui-components.md) | ✅ |

**Next**: `/speckit-tasks` 生成可执行任务列表。
