# Implementation Plan: 体验与视觉体系升级

**Branch**: `006-ux-visual-upgrade` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-ux-visual-upgrade/spec.md`  
**User constraints**（来自 setup.md）: 在现有 **React 19 + Vite + Tailwind 4 + CSS 变量主题** 上做纯前端体验与视觉升级；**零后端改动、零数据模型变更**；token 渐进迁移；新增 EmptyState / Toast / Skeleton / PriorityMeter；动效 150–250ms + `prefers-reduced-motion`。

## Summary

第六轮在 001～005 功能齐备基础上，**仅提升前端呈现、反馈与美观度**：建立设计 token 体系、统一过渡动效、重组顶栏三区与分段控件、卡片优先级可视化与分类色带、坐标图四象限可读化、空状态/骨架/Toast 反馈、登录页打磨。技术路径为 **`index.css` token 地基 + 分波组件迁移**；所有数据仍经既有 TanStack Query 与 `api.*`，不触及 `backend/`。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x

**Primary Dependencies**:
- Frontend（**唯一改动面**）: React 19, Vite, Tailwind 4, TanStack Query, date-fns
- Backend: **不修改**

**Storage**: 无 schema / migration / DTO 变更

**Testing**: [quickstart.md](./quickstart.md) 人工回归；可选 Vitest 组件 smoke（非本轮必须）

**Target Platform**: 浏览器响应式；桌面拖拽反馈为主；触摸拖拽降级策略沿用 005

**Project Type**: Web monorepo（`frontend/` only）

**Performance Goals**: 动效 150–250ms 不拖累交互；骨架仅在 `isLoading` 时渲染；toast 不阻塞主线程

**Constraints**:
- FR-017：禁止改数据模型、API、鉴权、业务语义
- 强调色：浅色 `#2563eb`、深色 `#76b900`
- 象限：艾森豪威尔四标签 + 轴名「重要度」「紧急度」+ 原点 (5,5)
- 若视觉需求依赖后端 → plan/tasks 标 `[BLOCKED]`，单独确认

**Scale/Scope**: 预计 **~25–35 前端文件**（含 ~8 新建、~20 改造）；**0 后端文件**

## Constitution Check

*GATE: Must pass before Phase 0. Re-check after Phase 1.*

Reference: `.specify/memory/constitution.md` (Watson **v1.3.1**)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth | 不改鉴权；LoginPage 仅视觉 | ✅ | ✅ |
| II. 密钥外置 | Secrets | 无新密钥、无硬编码 | ✅ | ✅ |
| III. AI 可插拔 | LLM | ChatPanel 仅开合动效；AI 不写日程 | ✅ | ✅ |
| IV. 日程卡片核心 | Data model | 卡片字段与生命周期语义不变；仅展示层 | ✅ | ✅ |
| V. 多设备一致 | Client | token/动效/响应式各端一致；触摸拖拽降级不变 | ✅ | ✅ |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation

```text
specs/006-ux-visual-upgrade/
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1（呈现层 only）
├── quickstart.md        # Phase 1 验证
├── contracts/
│   └── ui-components.md # Phase 1 UI 契约
└── tasks.md             # /speckit-tasks（下一步）
```

### Source Code（改动范围）

```text
watson/
├── backend/                          # 【本轮绝不触碰】
│   ├── drizzle/                      # 【绝不触碰】
│   └── src/                          # 【绝不触碰】
└── frontend/src/
    ├── index.css                     # 【改造】设计 token + @theme + reduced-motion
    ├── main.tsx / App.tsx            # 【改造】ToastProvider 挂载
    ├── pages/
    │   └── LoginPage.tsx             # 【改造】构图 + 标题 + 引导
    ├── layouts/
    │   └── AppShell.tsx              # 【改造】搜索空状态、Provider（若未在 App）
    ├── lib/
    │   └── categoryColor.ts          # 【新建】分类色带 hash
    ├── hooks/
    │   ├── useToast.tsx              # 【新建】toast context
    │   └── useCardMutations.ts       # 【微改】onSuccess 加 toast only
    └── components/
        ├── ui/
        │   ├── SegmentedControl.tsx    # 【新建】
        │   ├── EmptyState.tsx        # 【新建】
        │   ├── Skeleton.tsx          # 【新建】
        │   ├── Toast.tsx             # 【新建】
        │   ├── Modal.tsx             # 【改造】过渡
        │   └── Drawer.tsx            # 【改造】过渡
        ├── TopBar/
        │   └── TopBar.tsx            # 【改造】三区 + 分组 + 分段
        ├── search/
        │   └── GlobalSearch.tsx      # 【改造】宽度 + 空结果
        ├── auth/
        │   └── PinCodeInput.tsx      # 【改造】对比度 + 引导
        ├── cards/
        │   ├── PriorityMeter.tsx     # 【新建】
        │   ├── CompleteCheckbox.tsx  # 【改造】
        │   ├── PriorityPicker.tsx    # 【改造】展示态 meter
        │   ├── CardGrid.tsx          # 【改造】色带 + meter + 阴影
        │   └── CardList.tsx          # 【改造】同上
        ├── ScheduleViews/
        │   ├── QuadrantView.tsx      # 【改造】四象限 + tooltip
        │   ├── DayView.tsx           # 【改造】Skeleton + EmptyState
        │   ├── WeekView.tsx          # 【改造】
        │   ├── MonthView.tsx         # 【改造】
        │   ├── AllView.tsx           # 【改造】
        │   └── TrashView.tsx         # 【改造】
        └── ChatPanel/
            └── ChatPanel.tsx         # 【改造】开合过渡
```

**Structure Decision**: 延续 monorepo；**实现仅 `frontend/src/**`**；后端与 DB 层零 diff。

## 本轮绝不触碰

| 层 | 路径 / 范围 | 原因 |
|----|-------------|------|
| 后端全部 | `backend/**` | FR-017 |
| 数据库 | `backend/drizzle/*.sql`、`schema.ts`、migrate | 无数据模型变更 |
| API 契约 | `backend/src/routes/**`、`schedule.service.ts` 等 | 业务语义冻结 |
| 鉴权逻辑 | `backend/src/auth/**`、`middleware/auth.ts`、`useAuth` 校验逻辑 | 宪法 I |
| Query 数据逻辑 | `queryFn` 参数、`mutationFn` 实现、`queryKey` 结构 | 仅允许 `onSuccess` 增 toast |
| AI 写日程 | `llm/tools`、chat 写卡路径 | 宪法 III（已禁用） |
| DnD 语义 | `dragTrash.ts` 协议、`deleteCard` 调用时机 | 005 冻结 |

**允许的前端触摸（白名单）**:
- `useCardMutations.ts`：各 mutation 的 `onSuccess` 回调内调用 `toast.success()`；**禁止**改 `mutationFn`、`invalidate` 规则
- 组件 JSX / className / CSS 变量 / 纯展示 util（`categoryColor.ts`）

## 纯前端 vs 需确认项

| 类别 | 项 | 后端？ |
|------|-----|--------|
| **纯前端** | token、动效、TopBar、卡片、坐标、EmptyState、Toast、Skeleton、登录页 | 否 |
| **纯前端** | 分类色带 `hash(categoryId)` | 否 |
| **纯前端** | 拖拽垃圾箱视觉反馈（逻辑已有） | 否 |
| **需单列确认** | 若产品要求「分类色可配置持久化」 | 是 → **本轮不做**，用 hash |

## Token 体系组织与迁移策略

### 组织方式（`index.css`）

```text
@import "tailwindcss";

@theme inline {
  /* 桥接 Tailwind 语义类 → CSS 变量 */
  --radius-sm: var(--radius-sm);
  ...
}

:root {
  /* 现有 --bg/--fg/--panel/--border/--accent/--muted 保留 */
  --accent-hover: ...;
  --accent-active: ...;
  --accent-subtle: ...;
  --space-1..8: ...;
  --radius-sm/md/lg: ...;
  --shadow-sm/md/lg: ...;
  --text-xs..2xl: ...;
  --duration-fast/normal/slow: ...;
  --quadrant-q1..q4: ...;
}

.dark { /* 完整镜像 + 深色阴影/象限色 */ }

@media (prefers-reduced-motion: reduce) { ... }
```

### 迁移策略（4 波，见 [research.md](./research.md) R2）

> **交付顺序以 [tasks.md](./tasks.md) 用户故事为准。** Wave 仅表示「建议的文件迁移批次 / 回归切片」，不是强制交付里程碑（例如 Toast 在 US9、Login 在 US11，不必强行塞进 Wave 1 一次做完）。

1. **Wave 0 — 地基**：只加 token + 全局 transition + reduced-motion；不改组件或仅改 `body`/`#root`
2. **Wave 1 — 壳层**：TopBar、Modal、Drawer、ChatPanel（Login/Toast 可按 tasks 故事延后）
3. **Wave 2 — 内容**：CardGrid/List、QuadrantView、各 ScheduleView 的 Skeleton/EmptyState
4. **Wave 3 — 表单杂项**：PriorityPicker、PinCodeInput、GlobalSearch、CompleteCheckbox、Create/CardForm/芯片扫尾

每波结束跑 [quickstart.md](./quickstart.md) 对应章节 + 005 相关子集。

**TopBar 中区定稿**：`SegmentedControl(day|week|month|all)` + `AnchorDateControl`；`ViewTimeNav` 留在视图内；垃圾箱右侧独立。

## 新增 vs 改造组件

| 类型 | 组件 | 职责 |
|------|------|------|
| **新建** | `SegmentedControl` | 顶栏视图切换 |
| **新建** | `PriorityMeter` | 0～10 梯度 + 强度条 |
| **新建** | `EmptyState` | 无数据引导 |
| **新建** | `Skeleton` / `SkeletonCardGrid` | 加载占位 |
| **新建** | `Toast` + `useToast` | 成功反馈 |
| **新建** | `lib/categoryColor.ts` | 分类色带 |
| **改造** | `index.css` | token 源 |
| **改造** | `TopBar` | 三区布局、分组、搜索宽度 |
| **改造** | `CardGrid` / `CardList` | 色带、meter、层级、阴影 |
| **改造** | `CompleteCheckbox` | 勾选 UX |
| **改造** | `QuadrantView` | 四象限、轴、tooltip、稀少说明 |
| **改造** | `Day/Week/Month/All/TrashView` | Skeleton + EmptyState 分支 |
| **改造** | `Modal` / `Drawer` / `ChatPanel` | 开合过渡 |
| **改造** | `LoginPage` / `PinCodeInput` | 构图与引导 |
| **改造** | `GlobalSearch` | 宽度 + 空结果 |
| **改造** | `PriorityPicker` / `PriorityField` | 按钮面展示 meter |
| **微改** | `useCardMutations` | `onSuccess` → toast |
| **微改** | `App.tsx` 或 `AppShell` | `ToastProvider` |

## 动效统一方案

| 场景 | 实现 | 时长 |
|------|------|------|
| 主题切换 | `html` transition `background-color, color` | 200ms |
| Modal/Drawer | portal 内 opacity + translateY | 200ms |
| ChatPanel | width/transform transition | 200ms |
| Hover | `transition-colors` on 交互控件 | 150ms |
| CompleteCheckbox | scale + background | 150ms |
| 搜索展开 | `max-width` transition | 200ms |
| Reduced motion | 全局 media query → ~0ms | — |

实现要点：优先 CSS；避免 `framer-motion` 新依赖。

## 回归验证矩阵

| 改动类 | 必测（引用 001～005） |
|--------|----------------------|
| Token/主题 | 登录、明暗切换、AI 开合 |
| TopBar | 005 日期/视图/垃圾箱；003 搜索 |
| 卡片 | 完成、拖拽删、打开详情、编辑 |
| 坐标图 | 004/005 日常驻、全部浮层、取数 |
| Toast | 创建/完成/删/恢复/永久删 后列表正确 |
| 空状态/骨架 | 各视图无数据、加载不出现行为变化 |
| 登录 | 001 验证码鉴权 |

完整步骤见 [quickstart.md](./quickstart.md) V0–V8。

## Implementation Phases（指引 tasks 拆分）

### Phase A — Wave 0：设计 token 地基 【Frontend】

1. 扩充 `index.css` token（间距/圆角/阴影/字号/强调色状态/象限色/动效）
2. `@theme inline` 桥接 Tailwind
3. `prefers-reduced-motion` 全局规则
4. 验收：现有页面无布局崩溃

### Phase B — Wave 1：基础设施 + 壳层 【Frontend】

1. `ToastProvider` + `useToast` + `ToastHost`
2. `SegmentedControl`
3. `TopBar` 三区重组、操作区分组、搜索宽度、垃圾箱视觉增强
4. `Modal` / `Drawer` / `ChatPanel` 过渡
5. `LoginPage` / `PinCodeInput`
6. 验收：quickstart V1–V2、V7

### Phase C — Wave 2：卡片 + 坐标 + 视图反馈 【Frontend】

1. `categoryColor.ts` + `PriorityMeter`
2. `CardGrid` / `CardList` / `CompleteCheckbox`
3. `QuadrantView` 四象限 + tooltip + 稀少说明
4. `EmptyState` + `Skeleton` 接入五视图 + 搜索
5. `useCardMutations` onSuccess toast
6. 验收：quickstart V3–V6

### Phase D — Wave 3：收尾与全量回归 【Frontend】

1. `PriorityPicker` 展示态、`GlobalSearch` 空结果
2. 扫描残留硬编码 `rounded-lg` / `#2563eb` 等，按文件替换 token
3. 全量 005 quickstart + SC-001～008 抽检
4. 确认 `git diff` 无 `backend/` 变更

## Complexity Tracking

> 无宪法违规项；本轮不引入后端或数据模型变更。

| Item | Status |
|------|--------|
| 数据模型变更 | **无** — 符合 FR-017 |
| 新 npm 依赖 | **无**（优先 CSS + 既有栈） |

## Phase 0 / Phase 1 产出

| 产物 | 路径 | 状态 |
|------|------|------|
| Research | [research.md](./research.md) | ✅ |
| Data model（呈现层） | [data-model.md](./data-model.md) | ✅ |
| UI contracts | [contracts/ui-components.md](./contracts/ui-components.md) | ✅ |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ |

## Agents

仓库无 `update-agent-context` 脚本；以 `specs/006-ux-visual-upgrade/*` 与 `.specify/feature.json` 为准。
