# Implementation Plan: 优先级量化、垃圾箱与坐标视图

**Branch**: `004-priority-trash-coordinate` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-priority-trash-coordinate/spec.md`  
**User constraints**（来自 setup.md）: 在现有技术栈上迭代——Fastify + SQLite/Drizzle 后端，React 19 + Vite + Tailwind + TanStack Query 前端，单端口部署。标注纯前端 vs 触及后端/DB；三处 migration 顺序与旧数据兼容；未安排/已安排过滤口径；重名仅 active；坐标分桶规则。

**Clarification override**: setup 草稿写「旧截止型起始置空、仅留截止」；**澄清定案为清空全部时间字段 → 未安排**。本 plan / research / data-model **以澄清为准**。

## Summary

第四轮在 001–003 之上：**重要度/紧急度改为 0~10**、**取消 timeNature（已安排=有 startAt）**、**卡片生命周期（active / completed / deleted + 垃圾箱）**、**坐标视图**，以及详情即时编辑、快捷完成、TopBar/AI/主题/布局等前端修正。

技术路径：**后端 + DB（三处 migration + schedule service/API）** 与 **大块纯前端 UI** 并行。`updatedAt` 列已存在，本轮确保内容保存刷新；`title_lower` 唯一约束改为 **仅 active 部分唯一索引**。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x（与 001–003 相同）

**Primary Dependencies**:
- Backend: Fastify, Drizzle ORM, SQLite
- Frontend: React 19, Vite, Tailwind 4, TanStack Query, date-fns / date-fns-tz

**Storage**:
- SQLite `schedule_cards`：三处 schema migration（优先级整数、时间模型、生命周期）
- 客户端：`sessionStorage` 默认 `watson:chatOpen=0`；无新服务端偏好键

**Testing**: Vitest + RTL（前端）；`node:test` 扩展 schedule.service（值域、未安排过滤、生命周期、重名仅 active、迁移语义）

**Target Platform**: 浏览器响应式；单实例公网部署

**Project Type**: Web application monorepo（`backend/` + `frontend/`）

**Performance Goals**:
- 列表/完成/恢复后 TanStack invalidate 后视图 5s 内一致
- 坐标视图数百卡分桶渲染可交互（hover tooltip）
- 日/全部 grid 随宽度改列数、避免优先拉宽单卡

**Constraints**:
- 单用户会话鉴权不变；AI 不写日程
- 重名：**仅 `status = active`** 占用 `title_lower`（completed/deleted 释放标题）
- 截止型迁移：**清空** `start_at`/`end_at`/`deadline_at`（及停用 timeNature），非「仅留截止」
- 常规查询默认 `active`；垃圾箱 `completed|deleted` 按 `trashed_at` DESC；坐标与日/周/月/全部（常规）仅 active
- 搜索：客户端合并 `view=all` + `view=trash`，标注进箱原因，点开只读详情

**Scale/Scope**: 单用户；卡片数百；预计 30–45 文件（前后端 + 3 migrations）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (Watson **v1.3.0**)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth design | 新/改卡片生命周期端点均在 session 下；无未授权数据路径 | ✅ | ✅ |
| II. 密钥外置 | Secrets handling | 无新密钥；LLM 配置路径不变 | ✅ | ✅ |
| III. AI 可插拔 | LLM abstraction | AI 仍纯对话；完成/删除/恢复经 UI/API | ✅ | ✅ |
| IV. 日程卡片核心 | Data model | Schedule Card 唯一核心；已安排/未安排 + 重要×紧急 0~10（宪法 1.3.0 已对齐） | ✅ | ✅ |
| V. 多设备一致 | Client strategy | 同 API/同源；垃圾箱与坐标经同一后端状态 | ✅ | ✅ |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation (this feature)

```text
specs/004-priority-trash-coordinate/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   └── ui-components.md
└── tasks.md                 # /speckit-tasks（本命令不创建）
```

### Source Code（本特性改动范围）

```text
watson/
├── backend/
│   ├── drizzle/
│   │   ├── 0002_priority_numeric.sql      # 【新建】importance/urgency → INTEGER 0..10
│   │   ├── 0003_time_model.sql            # 【新建】停用 timeNature；截止型清空→未安排
│   │   └── 0004_card_lifecycle.sql        # 【新建】status + trashed_at；title 部分唯一
│   └── src/
│       ├── db/schema.ts
│       ├── types.ts
│       ├── services/schedule.service.ts
│       └── routes/cards.ts
└── frontend/src/
    ├── hooks/useChatPanelLayout.ts        # 默认 chatOpen=false
    ├── components/
    │   ├── TopBar/TopBar.tsx               # 垃圾箱图标；去登出；主题文案；AI 按钮态
    │   ├── cards/
    │   │   ├── PriorityPicker.tsx         # 【新建】0~10 竖向选择
    │   │   ├── CompleteCheckbox.tsx       # 【新建】完成方框
    │   │   ├── CardDetailModal.tsx        # 即时编辑；重置/确认；只读垃圾箱态
    │   │   ├── CreateCardModal.tsx        # 创建确认按钮 + Enter
    │   │   └── CardFormFields.tsx         # 无 timeNature；start/end 可选
    │   ├── ScheduleViews/
    │   │   ├── TrashView.tsx              # 【新建】
    │   │   ├── QuadrantView.tsx           # 【新建】坐标 SVG
    │   │   ├── DayView.tsx / AllView.tsx  # 坐标入口；完成方框；createdAt 排序；grid 调参
    │   │   ├── WeekView.tsx / MonthView.tsx # 页边距；拥挤；月跨天略宽不跨格
    │   │   └── CardGrid.tsx
    │   └── search/                        # 合并 trash；候选标注
    ├── hooks/useCardMutations.ts          # complete / restore / permanentDelete
    └── lib/api.ts
```

**Structure Decision**: 延续 monorepo；**触及 Backend+DB** 的集中在优先级值域、时间模型、生命周期、列表过滤与重名作用域；其余为 **纯前端**。

## 触及后端 / DB vs 纯前端

| 类别 | 项 |
|------|-----|
| **Backend + DB** | 三处 migration；importance/urgency 整数校验；取消 timeNature 写入；已安排= `startAt != null`；status/trashedAt；complete/soft-delete/restore/permanent-delete；列表默认 active；`view=trash`；`GET` by id 含箱内；`updatedAt` 在内容 PATCH 刷新；title 唯一仅 active；filter `scheduled` 替代 timeNature/hasTime |
| **纯前端** | PriorityPicker；TrashView；CompleteCheckbox；QuadrantView；详情即时编辑 UI；创建确认按钮；AI/主题/去登出；日全部排序与 grid；周月布局/跨天展示；搜索合并 trash 标注 |

## Migration 顺序（必须串行）

| Order | File | 职责 | 兼容要点 |
|-------|------|------|----------|
| 1 | `0002_priority_numeric.sql` | `importance`/`urgency` → INTEGER；映射 high=8, medium=5, low=2 | 先映射再改类型（SQLite 常见：新列→copy→drop→rename） |
| 2 | `0003_time_model.sql` | 持续型保留 start/end；**截止型清空全部时间字段**；`time_nature` 置 NULL 并停止业务使用（列可保留废弃或同迁删除） | **不以 setup「仅留截止」为准**；`deadline_at` 清空后业务层不再读写 |
| 3 | `0004_card_lifecycle.sql` | 加 `status`（默认 active）、`trashed_at`；**DROP** 全表 `title_lower` UNIQUE，建 **部分唯一** `WHERE status = 'active'` | 既有行全部 active；后续 soft-delete 释放标题 |

详见 [research.md](./research.md) R-001～R-004、[data-model.md](./data-model.md)。

## 未安排 vs 已安排（前后端统一口径）

| 状态 | 判定 | day/week/month | all（常规） | trash | 坐标 |
|------|------|----------------|-------------|-------|------|
| 未安排 | `startAt == null`（且 end 为空；不允许「仅 end」） | ❌ | ✅（active） | 若在箱内则只在 trash | 全部视图坐标含未安排 active；日视图坐标不含 |
| 已安排 | `startAt != null`；`endAt` 可选 | ✅（按区间/起始落入 range） | ✅ | 同上 | 按当前视图 active 集 |

服务端 `cardInRange`：无 `startAt` → false；仅 `startAt` → 点时落入；有 end → 区间重叠。

## Implementation Phases（实现指引，tasks 再拆）

### Phase A — Migrations + schema/types 【Backend】

按 0002 → 0003 → 0004 执行；更新 `schema.ts` / `types.ts`（`PriorityLevel` → `number` 0..10；`CardStatus`；移除业务对 `TimeNature` 依赖）。

### Phase B — schedule.service + routes 【Backend】

- create/update：值域；时间规则；重名仅 active；刷新 `updatedAt`
- list：默认 active；`view=trash`；filter `scheduled=true|false`；importance/urgency 整数
- `complete` / soft `remove` / `restore` / `permanentDelete`
- GET by id：active 与箱内均可返回

### Phase C — API 客户端 + 表单/详情 【Frontend + API】

PriorityPicker；无 timeNature 表单；即时编辑详情；创建确认；mutations。

### Phase D — 垃圾箱 + 快捷完成 + 搜索 【Frontend】

TrashView；TopBar 入口；CompleteCheckbox；搜索合并 trash。

### Phase E — 坐标视图 【Frontend】

QuadrantView；日/全部入口；分桶 (urgency, importance)；hover only。

### Phase F — 视觉与控件文案 【Frontend】

AI 默认关；主题二态；去登出；grid/周月布局。

### Phase G — 验收

对照 [quickstart.md](./quickstart.md) 与 SC-001～008。

## Complexity Tracking

> 原「宪法 IV 字面滞后」项已通过 **Constitution v1.3.0** 消除；无待记录违规。


## Agents / Skills 说明

仓库无独立 `update-agent-context` 脚本；本命令不新增 agent context 文件。下游以 `specs/004-priority-trash-coordinate/*` 与 `.specify/feature.json` 为准。
