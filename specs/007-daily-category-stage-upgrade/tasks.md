# Tasks: 日报、分类管理、日程阶段与体验升级

**Input**: Design documents from `/specs/007-daily-category-stage-upgrade/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: 本特性未要求引入 TDD 或新测试框架。每个用户故事包含基于 [quickstart.md](./quickstart.md) 的独立验证任务；最终阶段执行构建、迁移 smoke 与 001～006 回归。

**Organization**: 任务按原始用户故事编号组织；同优先级故事保持规格中的相对顺序，P1 故事优先于 P2。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可在不同文件上并行执行，且不依赖尚未完成的同阶段任务
- **[Story]**: 对应 `spec.md` 的 User Story 编号
- 所有任务都给出具体文件路径

## Phase 1: Setup（共享准备）

**Purpose**: 在不改变既有构建结构的前提下准备唯一新增前端依赖。

- [X] T001 在 `frontend/package.json` 与根 `package-lock.json` 添加 `react-markdown`，确认未引入 `rehype-raw` 且 `npm run build` 可解析依赖

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: 建立 migration、共享类型、系统分类与设计 token 地基；本阶段完成前不得开展用户故事实现。

**⚠️ CRITICAL**: 迁移必须按 T002 → T003 → T004 顺序登记和执行；应用启动完成全部 migration + seed 后才提供分类删除能力。

- [X] T002 在 `backend/drizzle/0006_daily_reports.sql` 和 `backend/drizzle/meta/_journal.json` 创建独立 `daily_reports` 表、日期主键与更新时间索引
- [X] T003 在 `backend/drizzle/0007_schedule_stage.sql` 和 `backend/drizzle/meta/_journal.json` 为 `schedule_cards` 添加非空默认 `not_started` 的 stage 列及索引
- [X] T004 在 `backend/drizzle/0008_none_category.sql` 和 `backend/drizzle/meta/_journal.json` 复用并系统化已有 `name_lower='无'` 记录，仅缺失时插入默认系统 ID，保留既有主键和卡片引用
- [X] T005 在 `backend/src/db/schema.ts` 同步 DailyReport 表、ScheduleCard stage 枚举和新增索引的 Drizzle schema 与 infer 类型
- [X] T006 [P] 在 `backend/src/types.ts` 定义 `CardStage`、扩展 `ScheduleCardDto.stage` 并增加 `DailyReportDto` 共享类型
- [X] T007 [P] 在 `frontend/src/lib/api.ts` 定义 `CardStage`、`DailyReport`、扩展 `ScheduleCard.stage`、`ScheduleCardInput.stage` 与 `CardQueryParams.stage`
- [X] T008 重构 `backend/src/db/seed.ts`，仅在全新数据库初始化「工作/个人/健康」，后续启动只永久幂等保证「无」且不复活用户删除的分类
- [X] T009 [P] 在 `frontend/src/index.css` 增加 stage 三态、过期底色、卡片 hover 条、日报焦点与 150～250ms 动效语义 token，并补齐明暗主题变量
- [X] T010 [P] 扩展 `frontend/src/hooks/useVisibilitySync.ts`，页面前台可见时每 3 秒失效并 refetch 活跃的 cards/categories/daily-report 查询，恢复可见时立即刷新，同时保持 AI 不触发日程刷新

**Checkpoint**: 空库和 0005 旧库均可迁移；历史卡 stage 为 `not_started`；「无」恰好一条；鉴权、密钥外置、AI 边界与卡片时间模型未改变。

---

## Phase 3: User Story 1 — 按日记录 GRAI 日报（Priority: P1）🎯 MVP

**Goal**: 所有者可在日视图按日期编辑 Goal、Result、Analysis & Insight，失焦保存并安全渲染 Markdown。

**Independent Test**: 执行 `specs/007-daily-category-stage-upgrade/quickstart.md` 的 V2～V3；两个日期内容隔离，其他视图无日报，失败保留草稿，原始 HTML 不执行。

- [X] T011 [P] [US1] 新建 `backend/src/services/daily-report.service.ts`，实现按日期读取与保留 createdAt 的完整快照 upsert
- [X] T012 [P] [US1] 在 `frontend/src/lib/api.ts` 增加 `getDailyReport(date)` 与 `putDailyReport(date, snapshot)`，遵循 `{ item: DailyReport | null }` 契约
- [X] T013 [US1] 新建 `backend/src/routes/daily-reports.ts`，严格校验真实 `YYYY-MM-DD` 和三个字符串字段并映射 GET/PUT 响应
- [X] T014 [US1] 在 `backend/src/app.ts` 构造 DailyReportService 并于既有全局鉴权 hook 之后注册 daily report 路由
- [X] T015 [US1] 新建 `frontend/src/components/daily-report/DailyReportField.tsx`，实现可键盘进入编辑、纯文本 textarea、失焦保存状态与安全 ReactMarkdown 展示
- [X] T016 [US1] 新建 `frontend/src/components/daily-report/DailyReportPanel.tsx`，实现按日期 query、本地三栏草稿、同日保存串行化、错误保留和跨日期响应隔离
- [X] T017 [US1] 在 `frontend/src/components/ScheduleViews/DayView.tsx` 挂载 DailyReportPanel，并按 `specs/007-daily-category-stage-upgrade/quickstart.md` V2～V3 验证 1 秒接口反馈、2 分钟完整流程、鉴权、日期隔离、失焦保存和窄屏三行

**Checkpoint**: User Story 1 可独立交付，不依赖分类、stage 或视觉升级。

---

## Phase 4: User Story 2 — 自定义日程分类（Priority: P1）

**Goal**: 所有者可在卡片表单旁新增/删除分类；删除时所有关联卡片事务改归「无」，删除「个人」后新卡默认「无」。

**Independent Test**: 执行 quickstart V4；覆盖 active/归档卡迁移、删除「无」失败、同名错误及删除「个人」后的默认行为。

- [X] T018 [P] [US2] 扩展 `backend/src/services/category.service.ts`，实现 findNone、默认分类 resolver 和覆盖全部生命周期卡片的原子删除事务
- [X] T019 [P] [US2] 在 `frontend/src/lib/api.ts` 扩展 Category DTO 的 `deletable` 并增加 create/delete category 方法
- [X] T020 [US2] 扩展 `backend/src/routes/categories.ts`，为列表返回 deletable、保持创建校验，并新增 `DELETE /api/categories/:id` 的 204/404/409 语义
- [X] T021 [US2] 修改 `backend/src/services/schedule.service.ts`，未显式分类时使用“个人存在则个人，否则无”，移除会自动重建个人的默认路径
- [X] T022 [US2] 新建 `frontend/src/hooks/useCategoryMutations.ts`，封装创建/删除并在成功后失效 `["categories"]` 与 `["cards"]`
- [X] T023 [US2] 改造 `frontend/src/components/cards/CardFormFields.tsx`，在分类控件旁加入新增输入和删除入口，并在删除后把当前值切换到「无」
- [X] T024 [US2] 在 `frontend/src/components/cards/CreateCardModal.tsx`、`frontend/src/components/cards/CardDetailModal.tsx` 与 `frontend/src/components/ui/ConfirmDialog.tsx` 接入分类 mutation 和“卡片归无但不删除卡片”的危险确认，并按 quickstart V4 验证 60 秒完整流程

**Checkpoint**: User Story 2 独立可测；删除任何非「无」分类后数据库不存在悬空 categoryId。

---

## Phase 5: User Story 3 — 标记与筛选日程处理阶段（Priority: P1）

**Goal**: 卡片持久化三态 stage、所有卡片显示文字徽章，并仅在“全部”视图按 stage 筛选。

**Independent Test**: 执行 quickstart V5；历史/新卡默认未开始，三态读写正确，修改 stage 不改变时间或生命周期，日/周/月无 stage 筛选器。

- [X] T025 [P] [US3] 扩展 `backend/src/services/schedule.service.ts` 的 CreateCardInput、CardQueryFilters、DTO 映射、create/update/listAll，校验 stage 且仅 `view=all` 应用 AND 筛选
- [X] T026 [P] [US3] 新建 `frontend/src/components/cards/StageBadge.tsx`，实现三态中文文字与明暗主题 token 映射且不只依赖颜色
- [X] T027 [US3] 扩展 `backend/src/routes/cards.ts`，解析 create/patch stage 与 all-view stage query，对非法值及非 all 组合返回 400
- [X] T028 [US3] 扩展 `frontend/src/lib/api.ts` 的卡片请求序列化，确保 stage 出现在 create/update body 和 all-view query 中
- [X] T029 [US3] 修改 `frontend/src/components/cards/CardFormFields.tsx`，将 stage 纳入 CardFormValues、默认值、card/input 映射、相等判断和只读展示
- [X] T030 [US3] 修改 `frontend/src/components/ScheduleViews/CardGrid.tsx`、`frontend/src/components/calendar/SpanBar.tsx` 与 `frontend/src/components/ScheduleViews/DayScheduleDrawer.tsx`，让日/周/月/全部/垃圾箱及日期抽屉卡片均显示不遮挡标题和操作的 stage 文字标识
- [X] T031 [US3] 修改 `frontend/src/components/ScheduleViews/AllView.tsx`，增加三态 stage 筛选状态、参数与 query key，且不改日/周/月筛选器
- [X] T032 [US3] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V5 验证历史回填、创建编辑、组合筛选、明暗主题与非法请求

**Checkpoint**: User Story 3 独立可交付，stage 与时间、安排状态、坐标及生命周期完全正交。

---

## Phase 6: User Story 4 — 按时间关系浏览日视图（Priority: P1）

**Goal**: 日视图把当天相关卡片互斥分入“今天截止 / 正在进行 / 今天开始”，不漏不重。

**Independent Test**: 执行 quickstart V6 的六类时间样例；同日始终只进截止，未安排和无关卡片隐藏。

- [X] T033 [P] [US4] 新建 `frontend/src/components/calendar/daySections.ts`，按 owner timezone 与半开日区间实现截止优先的三段互斥归类纯函数
- [X] T034 [US4] 重构 `frontend/src/components/ScheduleViews/DayView.tsx`，以固定顺序渲染三个章节并向每章 CardGrid 传 `sortMode="preserve"`
- [X] T035 [US4] 在 `frontend/src/index.css` 添加日章节标题、空章节和章节间距样式，确保空章节不触发整个日视图 EmptyState
- [X] T036 [US4] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V6 使用至少 20 张跨日边界卡片验证时区、章节顺序、100% 正确归类及零重复遗漏

**Checkpoint**: User Story 4 可在不依赖分类管理或 stage 筛选的情况下独立展示正确时间章节。

---

## Phase 7: User Story 9 — 保持既有能力无损（Priority: P1）

**Goal**: 新增数据仍受单用户会话保护，AI 继续不操作日程，P1 增量不破坏卡片核心规则和多设备刷新。

**Independent Test**: 执行 quickstart V1、V11 与 V12 中鉴权、AI、卡片时间、生命周期和多设备刷新子集。

- [X] T037 [P] [US9] 审核 `backend/src/middleware/auth.ts` 与 `backend/src/app.ts` 的新路由注册顺序，确保日报、分类删除和 stage 均受既有会话保护且无新增公开路径
- [X] T038 [P] [US9] 审核 `backend/src/services/llm/tools/handlers.ts` 与 `backend/src/services/llm/tools/definitions.ts`，确认未新增日报、分类或 stage 工具且 AI 不触发 query 刷新
- [X] T039 [US9] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V11 联调 `frontend/src/hooks/useVisibilitySync.ts`，验证两台前台可见设备在 3 秒内同步 cards/categories/daily-report 且恢复可见时立即刷新
- [X] T040 [US9] 执行 `specs/007-daily-category-stage-upgrade/quickstart.md` V1、V11 及 V12 的 P1 回归并修复发现的鉴权、时间、生命周期或默认分类回退

**Checkpoint**: P1 MVP（US1、US2、US3、US4、US9）可整体部署验证。

---

## Phase 8: User Story 5 — 独立使用日视图三大区域（Priority: P2）

**Goal**: 只有左上时间章节滚动，左下日报和右侧坐标图保持稳定，窄屏三块内容均可达。

**Independent Test**: 执行 quickstart V7；大量卡片滚动不推动日报/坐标图，渐隐提示准确且不拦截操作。

- [X] T041 [US5] 重构 `frontend/src/components/ScheduleViews/DayView.tsx` 为 body 横向 flex、左列纵向 flex 的完整 `min-h-0` 传递链，并只让左上章节容器 `overflow-auto`
- [X] T042 [P] [US5] 调整 `frontend/src/components/ScheduleViews/ScheduleViewRouter.tsx` 的日视图面板 overflow 边界，避免外层滚动与 ViewTimeNav/内部滚动竞争
- [X] T043 [US5] 在 `frontend/src/components/ScheduleViews/DayView.tsx` 和 `frontend/src/index.css` 加入基于 scroll position 的上下渐隐提示，边界隐藏且 overlay 不接收 pointer events
- [X] T044 [US5] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V7 验证桌面独立滚动、窄屏可达性和卡片点击/完成/拖拽不受遮罩影响

**Checkpoint**: User Story 5 独立满足三个区域互不推动的布局约束。

---

## Phase 9: User Story 6 — 更高效地创建与编辑卡片（Priority: P2）

**Goal**: 用横向整数色条替换旧竖向列表，重排表单并提供卡片弹层进出场动画。

**Independent Test**: 执行 quickstart V8；鼠标、键盘、触摸均能选择 11 个整数，只读与坐标图不变，弹层尺寸不变。

- [X] T045 [US6] 重写 `frontend/src/components/cards/PriorityPicker.tsx` 为原生 range 语义的 0～10 step=1 横向色条，支持键盘/触摸并显示跟随数值气泡
- [X] T046 [US6] 重排 `frontend/src/components/cards/CardFormFields.tsx`：移除时间 legend、开始/结束同行、优先级同行、分类/stage 同行并增高描述区
- [X] T047 [P] [US6] 完善 `frontend/src/components/ui/Modal.tsx` 的进入/退出状态，使创建与详情关闭动画完成后再卸载且保持焦点/ESC 语义
- [X] T048 [P] [US6] 在 `frontend/src/index.css` 增加 Priority range 轨道、thumb、气泡和 Modal 进出场样式，并接入 reduced-motion token
- [X] T049 [US6] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V8 验证 0～10 吸附、只读 PriorityMeter、坐标定位、字段布局与弹层尺寸

**Checkpoint**: User Story 6 可独立完成创建/编辑效率升级且不改变优先级数据。

---

## Phase 10: User Story 7 — 获得一致、克制的交互反馈（Priority: P2）

**Goal**: 补齐导航、卡片、坐标、主题、空状态、日报、确认框和拖拽删除反馈，并统一 reduced-motion。

**Independent Test**: 执行 quickstart V10；常态动效 150～250ms，减少动态效果下功能与静态状态均完整。

- [X] T050 [P] [US7] 修改 `frontend/src/components/TopBar/TopBar.tsx`，加入 currentColor 线性日程 SVG、标题 Watson，并增强垃圾箱 drag-over/接收反馈
- [X] T051 [P] [US7] 扩展 `frontend/src/components/ScheduleViews/CardGrid.tsx` 与 `frontend/src/components/calendar/SpanBar.tsx`，为两类拖拽卡片设置可辨认 drag image，并在日/全部 CardGrid 启用顶边 hover 窄条、有限 stagger 和 highlightedCardIds
- [X] T052 [P] [US7] 扩展 `frontend/src/components/ScheduleViews/QuadrantView.tsx`，让聚合圆 hover 放大高亮并向 embedded 日视图暴露明确 card ID 集合联动
- [X] T053 [P] [US7] 强化 `frontend/src/components/ui/ConfirmDialog.tsx` 的删除/永久删除危险配色层级，同时保留可发现的取消和既有焦点行为
- [X] T054 [P] [US7] 完善 `frontend/src/components/ui/Drawer.tsx`、`frontend/src/components/ui/EmptyState.tsx` 与 `frontend/src/components/daily-report/DailyReportField.tsx` 的进出场、轻呼吸和编辑强调状态
- [X] T055 [US7] 在 `frontend/src/components/ScheduleViews/DayView.tsx` 与 `frontend/src/components/ScheduleViews/CardGrid.tsx` 接通 QuadrantView hover 集合到三个章节对应卡片高亮
- [X] T056 [US7] 改造 `frontend/src/components/ui/SegmentedControl.tsx` 并统一 `frontend/src/index.css`，使用单一滑动 indicator 实现选中切换，同时收口 stagger、圆点、主题、呼吸、日报、危险确认和拖拽动画及 reduced-motion 降级
- [X] T057 [US7] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V10 在明暗主题及 reduced-motion 两种环境验证全部交互反馈

**Checkpoint**: User Story 7 的反馈只改变呈现，不改变任何业务调用时机或结果。

---

## Phase 11: User Story 8 — 识别过期卡片并正常使用导航（Priority: P2）

**Goal**: 全部视图准确标识过期活跃已安排卡片，并修复日/周/月日期按钮悬停裁切。

**Independent Test**: 执行 quickstart V9 过期矩阵和 V10 ViewTimeNav 检查；误标率为 0，所有悬停按钮完整可见。

- [X] T058 [P] [US8] 在 `frontend/src/components/ScheduleViews/AllView.tsx` 计算 active + startAt/endAt + endAt<now 的过期集合并仅向该视图 CardGrid 启用过期底色
- [X] T059 [P] [US8] 修复 `frontend/src/components/ScheduleViews/ViewTimeNav.tsx`、`frontend/src/components/ScheduleViews/DayView.tsx`、`frontend/src/components/ScheduleViews/WeekView.tsx` 与 `frontend/src/components/ScheduleViews/MonthView.tsx` 的 overflow/padding/z-index，使上浮按钮完整可见
- [X] T060 [US8] 按 `specs/007-daily-category-stage-upgrade/quickstart.md` V9～V10 验证未安排/未来/归档卡不误标及三种视图导航无遮挡

**Checkpoint**: User Story 8 两项缺陷均可独立验证且不改变卡片数据。

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: 收口类型、迁移、范围、响应式与 001～006 全量回归。

- [X] T061 [P] 对照 `specs/007-daily-category-stage-upgrade/contracts/api-usage.md` 与 UI 契约，清理 `backend/src/types.ts`、`backend/src/routes/cards.ts`、`backend/src/routes/categories.ts`、`backend/src/routes/daily-reports.ts` 及 `frontend/src/lib/api.ts` 的类型和错误语义偏差
- [X] T062 执行 `npm run build` 并修复 `backend/src/`、`frontend/src/` 的 TypeScript/Vite 构建错误
- [X] T063 使用临时空库、已有自定义「无」的 0007 库和 0005 旧库执行 `specs/007-daily-category-stage-upgrade/quickstart.md` V0 migration smoke，再完整执行 V1～V12
- [X] T064 审核最终 diff 与 `specs/007-daily-category-stage-upgrade/plan.md`，确认后端业务改动只涉及日报、分类、stage，AI/鉴权/密钥/卡片时间与生命周期无越界

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 无依赖。
- **Phase 2 Foundational**: 依赖 T001；阻塞全部用户故事。
- **P1 stories**:
  - US1、US2、US3 在 Foundational 后可并行开发。
  - US4 在 Foundational 后可独立开发，但与 US1 同改 DayView，建议串行合并。
  - US9 依赖 US1～US4 完成后执行 P1 宪法与回归收口。
- **P2 stories**:
  - US5 依赖 US1 + US4 的 DayView 最终结构。
  - US6 在 Foundational 后可独立开发，但与 US2/US3 同改 CardFormFields，建议后合并。
  - US7 依赖 US1/US3/US5 的日报、stage 和卡片布局落位。
  - US8 在 Foundational 后可开发，最终与 US7 视觉层联合验证。
- **Polish**: 依赖全部选择交付的用户故事。

### User Story Completion Order

```text
Setup -> Foundational
  ├─ US1 ─┐
  ├─ US2 ─┼─> US9(P1 checkpoint)
  ├─ US3 ─┤
  └─ US4 ─┘
       └─> US5 ─┐
  US2 + US3 ─> US6 ─┼─> US7
  Foundational ─> US8 ┘
All stories -> Polish
```

### Within Each User Story

- 数据模型/migration 先于 service。
- service 先于 route。
- API 类型与独立 UI 组件可并行。
- route 与 API client 完成后再集成页面。
- 每个故事完成后立即执行对应 quickstart 小节。

## Parallel Opportunities

- Foundational: T006、T007、T009、T010 可在迁移作者之外并行。
- US1: T011 与 T012 可并行；后端 route 和前端组件随后各自推进。
- US2: T018 与 T019 可并行；service/route 与前端 API/hook 可分工。
- US3: T025 与 T026 可并行；后端 stage 和前端 Badge 可分工。
- US4: T033 可独立于 DayView JSX 准备，合并前由 T034 接入。
- US9: T037 与 T038 可并行审计。
- US5: T042 可与 T041 并行，但合并后必须联合验证 overflow。
- US6: T047、T048 可与 PriorityPicker 实现并行。
- US7: T050～T054 位于不同组件，可并行；T055～T057 负责集成。
- US8: T058 与 T059 可并行。

## Parallel Examples

### US1

```text
Task T011: backend/src/services/daily-report.service.ts
Task T012: frontend/src/lib/api.ts
```

### US2

```text
Task T018: backend/src/services/category.service.ts
Task T019: frontend/src/lib/api.ts
```

### US3

```text
Task T025: backend/src/services/schedule.service.ts
Task T026: frontend/src/components/cards/StageBadge.tsx
```

### US4

```text
Task T033: frontend/src/components/calendar/daySections.ts
并行准备章节样式设计，待 T034 统一接入 DayView
```

### US9

```text
Task T037: backend auth/app audit
Task T038: backend LLM tools audit
```

### US5

```text
Task T041: DayView inner flex chain
Task T042: ScheduleViewRouter outer overflow boundary
```

### US6

```text
Task T045: PriorityPicker range
Task T047: Modal exit lifecycle
Task T048: index.css range/modal styles
```

### US7

```text
Task T050: TopBar
Task T051: CardGrid
Task T052: QuadrantView
Task T053: ConfirmDialog
Task T054: Drawer/EmptyState/DailyReportField
```

### US8

```text
Task T058: AllView overdue
Task T059: ViewTimeNav and view headers
```

## Implementation Strategy

### MVP First

1. 完成 Setup + Foundational。
2. 完成 US1（每日 GRAI 日报）。
3. 执行 quickstart V0～V3。
4. 可单独演示按日编辑、保存、Markdown 回看与日期隔离。

### P1 Product Increment

1. 在 MVP 后并行推进 US2、US3。
2. 合并 US4 日视图时间章节。
3. 以 US9 完成鉴权、AI、多设备与核心模型回归。
4. P1 完成后再进入布局和美术 P2，降低同时修改 DayView/CardFormFields 的冲突。

### Incremental P2 Delivery

1. US5 固定日视图三区域滚动。
2. US6 完成表单/优先级输入。
3. US7 统一交互反馈。
4. US8 修复过期和导航缺陷。
5. 最终执行 Polish 全量验证。

## Story Task Summary

| Story | Priority | Task count | Independent test |
|-------|----------|------------|------------------|
| US1 每日 GRAI 日报 | P1 | 7 | quickstart V2～V3 |
| US2 分类自定义管理 | P1 | 7 | quickstart V4 |
| US3 日程处理阶段 | P1 | 8 | quickstart V5 |
| US4 日视图时间分区 | P1 | 4 | quickstart V6 |
| US9 既有能力无损 | P1 | 4 | quickstart V1/V11/V12 子集 |
| US5 三区域独立布局 | P2 | 4 | quickstart V7 |
| US6 表单与优先级输入 | P2 | 5 | quickstart V8 |
| US7 交互与美术反馈 | P2 | 8 | quickstart V10 |
| US8 过期与导航修复 | P2 | 3 | quickstart V9～V10 |

## Notes

- `[P]` 只标记不同文件、无未完成依赖的并行任务。
- 不在本轮顺带引入测试框架；每个故事必须完成对应 quickstart 验证。
- 所有新增 API 都必须位于既有全局 auth hook 之后。
- AI 目录仅允许审计，不新增任何日程写工具。
- 每完成一个故事即可在其 checkpoint 停止并独立验证。
