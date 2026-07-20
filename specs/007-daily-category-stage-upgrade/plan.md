# Implementation Plan: 日报、分类管理、日程阶段与体验升级

**Branch**: `007-daily-category-stage-upgrade` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-daily-category-stage-upgrade/spec.md`

## Summary

第七轮在既有 Fastify + SQLite/Drizzle、React 19 + Vite + Tailwind 4 + TanStack Query 单端口架构上迭代。持久化改动严格集中为三条后端纵切：独立的每日 GRAI 日报表与按日 upsert 接口、分类删除事务与不可删除的「无」兜底分类、`schedule_cards.stage` 新列与“全部”视图筛选。其余时间分区、日视图独立滚动、优先级横向色条、卡片视觉标识、动效和缺陷修复均在前端完成。

迁移按 `0006_daily_reports` → `0007_schedule_stage` → `0008_none_category` 执行；全部迁移完成并由 seed 幂等确认「无」存在后，才启用分类删除路由。历史卡片阶段由数据库默认值回填为 `not_started`，现有非空 `category_id` 约束保持不变。正常情况下新卡片默认「个人」；若所有者已删除「个人」，则默认「无」且不重建「个人」。

## Technical Context

**Language/Version**: Node.js 22；TypeScript 5.8

**Primary Dependencies**:
- Backend: Fastify 5、Drizzle ORM 0.39、better-sqlite3 11、Zod 3
- Frontend: React 19、Vite 6、Tailwind CSS 4、TanStack Query 5、date-fns/date-fns-tz
- 新增前端依赖: `react-markdown`（不启用原始 HTML）

**Storage**: SQLite 单实例数据库；Drizzle schema + SQL migrations；WAL 模式

**Testing**: 仓库当前无自动化测试框架；以 `npm run build`、临时数据库 migration smoke、鉴权/API 手工验证和 [quickstart.md](./quickstart.md) 回归为必达门槛；日期分区纯函数列为首选自动化单测候选

**Target Platform**: Linux 公网单实例服务；现代桌面/平板/手机浏览器；前后端单端口部署

**Project Type**: Web monorepo（`backend/` + `frontend/`）

**Performance Goals**:
- 本地单实例下日报读取与保存应在 1 秒内给出成功或失败反馈
- 视图切换、色条拖动和卡片悬停保持连续响应，不因列表分组引入可感知卡顿
- 卡片区滚动仅更新自身滚动位置，不触发布局级页面滚动

**Constraints**:
- 只有日报、分类、stage 三处允许触及后端/DB
- 新接口全部经过现有会话鉴权；AI 不读写或联动这些数据
- `category_id NOT NULL`、卡片时间合法性和生命周期语义保持不变
- 动效常态 150～250ms，并受 `prefers-reduced-motion` 统一降级
- 日报 Markdown 不解析原始 HTML

**Scale/Scope**: 严格单用户、单实例；数百至低千级卡片与按日积累的日报；预计新增/改造约 10 个后端文件、20～30 个前端文件及 6 份规划文档

## Constitution Check

*GATE: Phase 0 前检查；Phase 1 设计后复核。*

Reference: `.specify/memory/constitution.md` (Watson v1.3.1)

| Principle | Gate | Phase 0 | Phase 1 |
|-----------|------|---------|---------|
| I. 单用户安全第一 | 日报、分类删除、stage 接口均位于既有 `/api/*` 会话保护下；未授权返回 401 | PASS | PASS |
| II. 密钥外置 | 无新增密钥、服务地址或凭证；Markdown 依赖不需要配置秘密 | PASS | PASS |
| III. AI 能力可插拔 | 不修改 provider；AI 不接入日报、分类或卡片 stage 工具 | PASS | PASS |
| IV. 日程卡片核心 | stage 是卡片独立字段；时间、优先级、分类和生命周期继续由同一模型读写；日报明确独立且不是日程 | PASS | PASS |
| V. 多设备一致 | 新数据来自同一数据库/API；前台每 3 秒刷新活跃 cards/categories/daily-report 查询，页面恢复可见时立即刷新；响应式日报布局 | PASS | PASS |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass
- [x] No violations require Complexity Tracking

## Project Structure

### Documentation

```text
specs/007-daily-category-stage-upgrade/
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
│   ├── 0006_daily_reports.sql
│   ├── 0007_schedule_stage.sql
│   └── 0008_none_category.sql
└── src/
    ├── app.ts
    ├── types.ts
    ├── db/
    │   ├── schema.ts
    │   └── seed.ts
    ├── routes/
    │   ├── cards.ts
    │   ├── categories.ts
    │   └── daily-reports.ts
    └── services/
        ├── schedule.service.ts
        ├── category.service.ts
        └── daily-report.service.ts

frontend/src/
├── index.css
├── lib/api.ts
├── hooks/
│   ├── useCardMutations.ts
│   ├── useCategoryMutations.ts
│   └── useVisibilitySync.ts
└── components/
    ├── TopBar/TopBar.tsx
    ├── calendar/daySections.ts
    ├── cards/
    │   ├── CardFormFields.tsx
    │   ├── PriorityPicker.tsx
    │   └── StageBadge.tsx
    ├── calendar/
    │   ├── daySections.ts
    │   └── SpanBar.tsx
    ├── daily-report/
    │   ├── DailyReportPanel.tsx
    │   └── DailyReportField.tsx
    ├── ScheduleViews/
    │   ├── DayView.tsx
    │   ├── AllView.tsx
    │   ├── CardGrid.tsx
    │   ├── DayScheduleDrawer.tsx
    │   ├── QuadrantView.tsx
    │   └── ViewTimeNav.tsx
    └── ui/
        ├── SegmentedControl.tsx
        ├── ConfirmDialog.tsx
        ├── Modal.tsx
        ├── Drawer.tsx
        └── EmptyState.tsx
```

**Structure Decision**: 延续现有 monorepo 和服务/路由/组件分层，不引入新应用或状态管理框架。日报采用独立 service/route 和独立前端组件；日期分区抽为纯函数；分类与 stage 复用既有卡片查询和表单路径。

## Phase 0 Decisions

详细论证见 [research.md](./research.md)。

1. 日报以 `date` 文本主键独立保存，GET 返回 `{ item: null }` 表示尚未创建，PUT 写入完整三栏快照并 upsert。
2. 分类删除在数据库事务内更新所有生命周期状态的关联卡片，再删除分类；仅「无」不可删除。
3. 「个人」允许删除；默认分类解析为“个人存在则个人，否则无”，不得用 `findOrCreate("个人")` 自动复建。
4. stage 使用受限英文存储值，非空默认 `not_started`；非法输入返回 400，仅 `view=all` 接受筛选。
5. 日视图继续复用后端区间相交查询，前端按所有者时区执行互斥分区。
6. Markdown 使用 `react-markdown` 且不启用原始 HTML；日报保存按日期串行并用日期快照防止跨日写错。
7. 不扩展 sync 协议；页面前台可见时每 3 秒失效并重新读取活跃的 cards、categories 与 daily-report 查询，恢复可见时立即刷新，以满足多设备 3 秒内一致且避免分类删除 tombstone 扩大后端范围。

## Phase 1 Design

### Backend + DB

1. `0006_daily_reports.sql` 创建日报表及更新时间索引，与卡片无外键。
2. `0007_schedule_stage.sql` 添加非空默认 stage 并建立索引；SQLite 默认值自然覆盖历史行。
3. `0008_none_category.sql` 先复用并系统化已有 `name_lower='无'` 记录；仅不存在时才插入默认系统 ID。业务始终按 `nameLower` 解析「无」，不要求改写已有主键；`seed.ts` 区分首次初始化与后续启动。
4. `DailyReportService` 实现按日读取和 upsert；路由严格校验 `YYYY-MM-DD` 与字符串请求体。
5. `CategoryService.delete` 通过事务完成“校验 → 获取无 → 全量改指 → 删除”，返回迁移数量；路由拒绝删除「无」。
6. `ScheduleService`、DTO 与卡片路由读写 stage；stage patch 不影响时间或 status；筛选与既有条件按 AND 组合。

### Frontend

1. `lib/api.ts` 扩展 `DailyReport`、`CardStage`、category mutation 和查询参数。
2. 日报组件维护按日期隔离的草稿；失焦保存，错误时保留输入；切换日期后旧请求不得回写新日期状态。
3. `DayView` 使用嵌套 `flex + min-h-0`：只有左上章节区 `overflow-auto`，日报和右侧坐标图不随之滚动。
4. `CardFormFields` 重排字段并加入 stage 与分类管理；PriorityPicker 完整替换为横向整数 range。
5. `CardGrid`、`SpanBar` 与 `DayScheduleDrawer` 统一接入 StageBadge；CardGrid 视觉层为左缘分类色带、角标 stage、顶边 hover 条、独立 checkbox、底层过期色。
6. `AllView` 独占 stage 筛选和过期提示；日/周/月只展示 stage 徽章。
7. `SegmentedControl` 增加共享滑动 indicator；所有新增动效复用 token，减少动态效果时关闭或缩短至近即时。

## Implementation Slices

### Slice A — 数据地基【Backend + DB】

- 三条 migration、schema、seed、后端公共类型
- migration smoke：空库与 0005 旧库均可升级

### Slice B — 日报纵切【Backend + Frontend】

- service + GET/PUT route + API client + TanStack Query + Markdown 三栏组件
- 验证按日隔离、失焦保存、失败保留、鉴权与切日竞态

### Slice C — 分类与 stage【Backend + Frontend】

- 分类删除事务、默认分类 resolver、分类 mutation
- stage DTO/创建/编辑/过滤、表单字段与徽章
- 验证删除「个人」后默认「无」、删除「无」失败、历史 stage 默认

### Slice D — 日视图与输入体验【Frontend】

- 时间三区纯函数、独立滚动布局、渐隐提示
- PriorityPicker 横向色条、表单重排

### Slice E — 视觉与缺陷修复【Frontend】

- Logo、hover 顶条、多元素排布、坐标联动、主题与弹层动效
- 过期泛红、ViewTimeNav 裁切、危险确认与拖拽反馈

### Slice F — 回归与收口【Full stack】

- 运行 [quickstart.md](./quickstart.md) 全部场景与 001～006 回归
- 前后端 build、鉴权检查、明暗主题、响应式和 reduced-motion 检查
- 确认后端 diff 仅涉及日报、分类、stage 三条纵切

## Agent Context

仓库 `.specify/scripts/` 当前没有 `update-agent-context` 脚本；无需执行上下文更新。后续命令以 `.specify/feature.json` 指向的本特性目录及本目录内 spec/plan/research/data-model/contracts/quickstart 为权威上下文。

## Complexity Tracking

无宪法违规项，不需要例外论证。
