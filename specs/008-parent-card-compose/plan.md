# Implementation Plan: 日程卡片组合与父卡片

**Branch**: `008-parent-card-compose` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-parent-card-compose/spec.md`

## Summary

第八轮在既有 Fastify + SQLite/Drizzle、React 19 + Vite + Tailwind + TanStack Query 单端口架构上迭代，引入「父卡片」容器：标准卡通过 `kind` + `parentId` 归属到父卡；概览视图（全部/周/月）折叠显示父卡，日视图摊开子卡并带折页角标。

**触及后端 + DB**：`schedule_cards` 扩展 `kind` / `parentId` / `timeManual` / `lastParentTitle`；组合·加入·合并·移出·父卡更新·清零硬删·恢复归回/重建；`listAll` 按 view 重构可见性。  
**纯前端**：全部视图卡片间 drop（与右上垃圾箱 drop 并存）、创建父卡确认框、父卡堆叠外观与详情弹层、日视图折页、周/月 SpanBar 展示父卡、坐标图继续只画标准卡。

## Technical Context

**Language/Version**: Node.js 22；TypeScript 5.8

**Primary Dependencies**:
- Backend: Fastify 5、Drizzle ORM 0.39、better-sqlite3 11、Zod 3
- Frontend: React 19、Vite 6、Tailwind CSS 4、TanStack Query 5、date-fns/date-fns-tz
- 无新增 npm 依赖（复用 Modal、dnd MIME、动效 token）

**Storage**: SQLite 单实例；Drizzle schema + SQL migrations；WAL

**Testing**: 无自动化测试框架；以 `npm run build`、临时库 migration smoke、鉴权/API 手工验证与 [quickstart.md](./quickstart.md) 为门槛；父卡时间包络与 `listAll` 可见性纯函数列为单测候选

**Target Platform**: Linux 公网单实例；现代浏览器；单端口部署

**Project Type**: Web monorepo（`backend/` + `frontend/`）

**Performance Goals**:
- 组合/移出/合并在单用户数百卡规模下于 1 秒内完成并刷新视图
- 全部视图拖拽反馈连续；reduced-motion 下降级为近即时
- `listAll` 不因父卡聚合引入可感知卡顿（单次查询 + 内存过滤即可）

**Constraints**:
- 新接口全部走既有会话鉴权；AI 不读写父卡
- 父卡 `categoryId` 保持 NOT NULL：固定写入 `system-none` 占位，不放宽列约束
- 父卡时间汇总与「手调保留、突破才扩展」**仅在后端**维护
- 组合拖拽仅全部视图；与拖到右上垃圾箱删除靠 drop 目标区分
- 动效受 `prefers-reduced-motion`；明暗主题堆叠影/折页可读
- 001～007 行为回归无损

**Scale/Scope**: 严格单用户；数百～低千级卡片；预计后端 ~8 文件、前端 ~15 文件及本目录设计文档

## Constitution Check

*GATE: Phase 0 前检查；Phase 1 设计后复核。*

Reference: `.specify/memory/constitution.md` (Watson v1.3.1)

| Principle | Gate | Phase 0 | Phase 1 |
|-----------|------|---------|---------|
| I. 单用户安全第一 | 组合/移出/父卡更新/list 可见性均在既有 `/api/*` 会话下；未授权 401 | PASS | PASS |
| II. 密钥外置 | 无新增密钥或外部服务 | PASS | PASS |
| III. AI 能力可插拔 | 不修改 provider；AI 不组合/移出/读写父卡 | PASS | PASS |
| IV. 日程卡片核心 | 父卡是同表新类型；标准卡时间/优先级/分类/阶段/生命周期语义不变；未安排仍起止皆空 | PASS | PASS |
| V. 多设备一致 | 同一 DB/API；既有 cards 查询失效刷新；无仅单端能力 | PASS | PASS |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass
- [x] No violations require Complexity Tracking

## Project Structure

### Documentation

```text
specs/008-parent-card-compose/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   └── ui-components.md
└── tasks.md                 # 由 /speckit-tasks 后续生成
```

### Source Code

```text
backend/
├── drizzle/
│   └── 0011_parent_cards.sql
└── src/
    ├── types.ts
    ├── db/
    │   └── schema.ts
    ├── routes/
    │   └── cards.ts
    └── services/
        └── schedule.service.ts

frontend/src/
├── lib/api.ts
├── hooks/
│   └── useCardMutations.ts
├── components/
│   ├── dnd/
│   │   └── dragTrash.ts          # 可扩展 card-drop 辅助，MIME 不变
│   ├── cards/
│   │   ├── CreateParentModal.tsx # 新建：标准→标准确认
│   │   └── ParentCardDetailModal.tsx
│   ├── ScheduleViews/
│   │   ├── AllView.tsx
│   │   ├── CardGrid.tsx
│   │   ├── DayView.tsx
│   │   ├── WeekView.tsx
│   │   ├── MonthView.tsx
│   │   ├── TrashView.tsx
│   │   └── QuadrantView.tsx      # 确认过滤 kind=parent
│   ├── calendar/
│   │   └── SpanBar.tsx
│   └── TopBar/
│       └── TopBar.tsx            # 垃圾箱 drop 目标保持不变
```

**Structure Decision**: 延续 monorepo 与 ScheduleService 中心化；父卡不新建表，同表 `kind` 区分；组合 API 挂在既有 `cards` 路由下。

## Phase 0 Decisions

详细论证见 [research.md](./research.md)。

1. **Schema**：`kind`（standard|parent，默认 standard）+ `parentId`（可空自引用）+ `timeManual`（父卡手调标记）+ `lastParentTitle`（进垃圾箱时父名快照）；索引 `idx_cards_parent_id`。
2. **categoryId**：父卡创建时固定 `system-none`；不放宽 NOT NULL；importance/urgency/stage/description 写默认并在 API/UI 忽略。
3. **时间维护**：全部在后端；触发点见 research R3；`timeManual=false` 时始终对齐子卡包络，`true` 时仅被动扩展。
4. **可见性**：`listAll` 按 view 过滤——all/week/month 返回父卡+无归属标准卡；day 返回标准卡（含有 parentId）不返回父卡；trash 不返回父卡，标准卡带 `lastParentTitle`。
5. **清零**：子卡移出/完成/删除后，活跃 `parentId` 引用归零则**硬删**父卡行（不设 trashedAt）。
6. **恢复**：用 `lastParentTitle` 找同名活跃父卡或重建；标题撞名则递增 `_` 前缀直至唯一。
7. **DnD**：同一 `application/x-watson-card` MIME；TopBar 垃圾箱 vs CardGrid 卡片 drop 靠落点区分。

## Phase 1 Design

### Backend + DB【触及后端】

1. Migration `0011_parent_cards.sql`：加列 + 历史回填 `kind='standard'`, `parentId=NULL`, `timeManual=0`, `lastParentTitle=NULL` + `idx_cards_parent_id`。
2. 扩展 `ScheduleCardDto`：`kind`, `parentId`, `childCount?`, `timeManual?`, `lastParentTitle?`, `parentTitle?`（日视图活跃子卡解析当前父名）。
3. 服务方法：`compose`, `addChild`, `mergeParents`, `detachChild`, `update`（父卡分支校验）、`recomputeParentTime` + `hardDeleteParentIfEmpty`（包络与清零；合称父卡一致性维护）、扩展 `complete`/`delete`/`restore`/`listAll`。
4. 路由：见 [contracts/api-usage.md](./contracts/api-usage.md)。
5. 标题唯一：父卡 `title`/`titleLower` 纳入既有 partial unique + `assertTitleUnique`（仅 active）。

### Frontend【纯前端为主，调用新 API】

1. `api.ts` + `useCardMutations`：compose/addChild/merge/detach。
2. `CardGrid`：父卡渲染分支；全部视图启用 card-on-card drop；四阶段反馈。
3. `CreateParentModal`：名称必填就地校验、默认可改时间、待纳入列表。
4. `ParentCardDetailModal`：改名/时间就地校验；迷你子卡网格拖出=detach。
5. `DayView`：折页角标 → 打开父详情；分区仍 `buildDaySections`。
6. `WeekView`/`MonthView`/`SpanBar`：渲染父卡时段；子卡不在列表中。
7. `TrashView`：展示 `lastParentTitle`；`QuadrantView`：`kind !== 'parent'`。

## Implementation Slices

### Slice A — 数据地基【Backend + DB】

- schema、0011 migration、types、DTO 字段
- 空库/升级库 migration smoke

### Slice B — 组合与父卡服务【Backend】

- compose / addChild / merge / detach / 包络维护 / 清零硬删
- 扩展 complete、delete、restore、listAll 可见性
- 路由与契约对齐

### Slice C — 全部视图组合 DnD【Frontend】

- CardGrid drop 目标、CreateParentModal、与 TopBar 垃圾箱共存
- 父卡外观（堆叠影、计数徽章）

### Slice D — 详情、日视图折页、周月与垃圾箱【Frontend】

- ParentCardDetailModal、折页角标、Week/Month 父卡、Trash 父名标注
- QuadrantView 排除父卡确认

### Slice E — 回归与收口【Full stack】

- [quickstart.md](./quickstart.md) 全场景 + 001～007 回归
- build、鉴权、明暗、reduced-motion

## Pure Frontend vs Backend Matrix

| 能力 | 归属 |
|------|------|
| kind/parentId/timeManual/lastParentTitle migration | Backend + DB |
| 组合/加入/合并/移出/父卡 PATCH | Backend |
| 时间包络与手调策略 | Backend |
| 清零硬删、恢复归回/重建、重名 `_` 前缀 | Backend |
| listAll 按 view 可见性 | Backend |
| 卡片↔卡片 drop、确认框、堆叠外观、详情 UI、折页、周月展示、坐标图过滤 | Frontend |
| 拖到右上垃圾箱删除 | Frontend（既有，不变） |

## Agent Context

仓库 `.specify/scripts/` 当前没有 `update-agent-context` 脚本；无需执行上下文更新。后续以 `.specify/feature.json` → `specs/008-parent-card-compose` 及本目录产物为权威上下文。

## Complexity Tracking

无宪法违规项，不需要例外论证。
