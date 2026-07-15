# Tasks: 优先级量化、垃圾箱与坐标视图

**Input**: Design documents from `/specs/004-priority-trash-coordinate/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 [quickstart.md](./quickstart.md)）

**Organization**: 按用户故事分组；**backend + frontend** 均有变更。澄清定案以 spec Clarifications 为准（截止型清空→未安排；重名仅 active）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US8）
- 路径相对于仓库根目录

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 三处 Drizzle migration 文件与 journal 就绪（串行写文件，勿乱序）

- [x] T001 Create migration `0002_priority_numeric.sql`: map high→8/medium→5/low→2 and convert `importance`/`urgency` to INTEGER 0..10 in `backend/drizzle/0002_priority_numeric.sql`
- [x] T002 Create migration `0003_time_model.sql`: keep duration start/end; **clear all time fields for deadline rows** (unscheduled); null out `time_nature` / clear `deadline_at` in `backend/drizzle/0003_time_model.sql`
- [x] T003 Create migration `0004_card_lifecycle.sql`: add `status` + `trashed_at`; drop full-table `title_lower` UNIQUE; create partial unique index `WHERE status = 'active'` in `backend/drizzle/0004_card_lifecycle.sql`
- [x] T004 Register `0002`–`0004` entries in order in `backend/drizzle/meta/_journal.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema、类型、schedule 核心规则、生命周期 API、前端 API 客户端——**所有用户故事的前置**

**⚠️ CRITICAL**: 完成本阶段前不得开始用户故事 UI 实现

- [x] T005 Update `schedule_cards` schema: integer priority, `status`, `trashedAt`, drop business use of `timeNature`/`deadlineAt` in `backend/src/db/schema.ts`
- [x] T006 [P] Replace `PriorityLevel` enum with `number` 0..10; add `CardStatus`; remove `TimeNature` from public DTO in `backend/src/types.ts`
- [x] T007 Rewrite time validation: scheduled ⇔ `startAt != null`; reject end-without-start; stop accepting `timeNature`/`deadlineAt` in `backend/src/services/schedule.service.ts`
- [x] T008 Update `cardInRange` for start-only and start–end intervals; unscheduled never in day/week/month in `backend/src/services/schedule.service.ts`
- [x] T009 Enforce importance/urgency integer range [0,10] defaults 5 on create/update in `backend/src/services/schedule.service.ts`
- [x] T010 Scope `assertTitleUnique` to `status = 'active'` only in `backend/src/services/schedule.service.ts`
- [x] T011 Implement lifecycle ops: `complete`, soft `remove`, `restore` (409 on title conflict), `permanentDelete`; default list filter `active` in `backend/src/services/schedule.service.ts`
- [x] T012 Support `view=trash` (completed+deleted, `trashedAt` DESC), `scheduled` filter, integer importance/urgency filters; deprecate `hasTime`/`timeNature` in `backend/src/services/schedule.service.ts`
- [x] T013 Wire routes: `POST .../complete`, soft `DELETE`, `POST .../restore`, `DELETE .../permanent`; GET by id includes trash; PATCH rejects non-active in `backend/src/routes/cards.ts`
- [x] T014 Run migrations (`npm run db:migrate` in backend workspace) and smoke-check mapping + deadline→unscheduled on local SQLite
- [x] T015 [P] Update `ScheduleCard` / inputs / `getCards` params (`view=trash`, `scheduled`, numeric priority) and lifecycle API helpers in `frontend/src/lib/api.ts`
- [x] T016 [P] Add mutations `completeCard`, `restoreCard`, `permanentDeleteCard`; change delete to soft-delete; invalidate `["cards"]` in `frontend/src/hooks/useCardMutations.ts`

**Checkpoint**: Foundation ready — 可用 API 完成软删/完成/恢复；未安排只在 all；标题仅 active 唯一

---

## Phase 3: User Story 1 - 卡片完成、删除与垃圾箱恢复 (Priority: P1) 🎯 MVP

**Goal**: 垃圾箱视图；TopBar 垃圾箱入口（去登出）；完成/软删进箱；恢复与永久删除；箱内只读详情；搜索标注箱内项

**Independent Test**: 完成与删除进箱并从常规视图消失；垃圾箱倒序+角标；恢复回活跃；永久删除不可恢复（见 spec US1）

### Implementation for User Story 1

- [x] T017 [P] [US1] Extend `ViewMode` with `trash` and render `TrashView` in `frontend/src/components/ScheduleViews/ScheduleViewRouter.tsx`
- [x] T018 [P] [US1] Create `TrashView` grid (trashedAt DESC, completed checkmark / deleted red-dot badges, restore + permanent-delete actions) in `frontend/src/components/ScheduleViews/TrashView.tsx`
- [x] T019 [US1] Replace logout with trash icon navigating to `view=trash` in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T020 [US1] Narrow delete ConfirmDialog; label「删除」; soft-delete via mutation in `frontend/src/components/cards/CardDetailModal.tsx` (and shared dialog styles if needed)
- [x] T021 [US1] Open trash cards read-only (no edit/complete/confirm-save) in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T022 [US1] Merge `view=all` + `view=trash` into search candidates with「已完成」「已删除」labels; open read-only detail in `frontend/src/components/search/GlobalSearch.tsx` and `frontend/src/components/search/titleSearch.ts`

**Checkpoint**: US1 MVP — 垃圾箱闭环可用（快捷完成方框可暂用详情删除/后续 US5）

---

## Phase 4: User Story 2 - 时间模型：已安排与未安排 (Priority: P2)

**Goal**: UI 取消时间性质；仅标题可建未安排；`scheduled` 筛选替换旧时间筛选

**Independent Test**: 无时间卡片只在全部；填 start 后进日历；表单无 timeNature（见 spec US2）

### Implementation for User Story 2

- [x] T023 [US2] Remove timeNature UI; start/end optional with validation (end requires start) in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T024 [US2] Align create/edit payloads to new time model (no timeNature/deadlineAt) in `frontend/src/components/cards/CreateCardModal.tsx` and `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T025 [US2] Replace AllView timeNature/hasTime filters with `scheduled` true/false; **keep category (and other non-time) filters** in `frontend/src/components/ScheduleViews/AllView.tsx`
- [x] T026 [US2] Update week/month/day card range rendering to use start/end only (no deadline branch) in `frontend/src/components/ScheduleViews/WeekView.tsx`, `MonthView.tsx`, `DayView.tsx` as needed

**Checkpoint**: US2 — 已安排/未安排与后端口径一致

---

## Phase 5: User Story 3 - 重要度与紧急度 0~10 量化 (Priority: P3)

**Goal**: 竖向 0~10 PriorityPicker；筛选与展示用整数

**Independent Test**: 点选 0 与 10；历史映射卡可再编辑（见 spec US3）

### Implementation for User Story 3

- [x] T027 [P] [US3] Create vertical 0→10 (bottom→top) `PriorityPicker` in `frontend/src/components/cards/PriorityPicker.tsx`
- [x] T028 [US3] Wire PriorityPicker into create/detail forms in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T029 [US3] Update AllView importance/urgency filters to integer 0..10 in `frontend/src/components/ScheduleViews/AllView.tsx`
- [x] T030 [US3] Replace any remaining high/medium/low display/score helpers in frontend (e.g. `frontend/src/lib/` or card chrome) with 0..10

**Checkpoint**: US3 — 优先级量化可端到端设定

---

## Phase 6: User Story 4 - 详情即时编辑与放弃/确认 (Priority: P4)

**Goal**: 活跃详情直接可编；「重置」（回 snapshot）+「确认」保存；遮罩放弃；无编辑二次确认（勿与垃圾箱「恢复」混用）

**Independent Test**: 遮罩丢弃；重置不关；确认才写；空标题/重名就地错误（见 spec US4）

### Implementation for User Story 4

- [x] T031 [US4] Refactor `CardDetailModal` to always-editable draft + snapshot; enable「重置」when dirty;「确认」PATCH close in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T032 [US4] Mask/outside click discards draft and closes without save in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T033 [US4] Inline validation errors (empty title / 409) without closing in `frontend/src/components/cards/CardDetailModal.tsx`

**Checkpoint**: US4 — 即时编辑流程符合 spec

---

## Phase 7: User Story 5 - 快捷完成入口 (Priority: P5)

**Goal**: 详情右上角 + 日/全部卡片右侧完成方框；无二次确认

**Independent Test**: 三入口完成均进箱且标记已完成（见 spec US5）

### Implementation for User Story 5

- [x] T034 [P] [US5] Create `CompleteCheckbox` calling `completeCard` in `frontend/src/components/cards/CompleteCheckbox.tsx`
- [x] T035 [US5] Place CompleteCheckbox on detail top-right in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T036 [US5] Place CompleteCheckbox on DayView and AllView card chrome (not week/month faces) in `frontend/src/components/ScheduleViews/DayView.tsx`, `AllView.tsx`, and/or `CardGrid.tsx`

**Checkpoint**: US5 — 一键完成可用

---

## Phase 8: User Story 6 - 二维坐标视图 (Priority: P6)

**Goal**: 日/全部打开坐标 overlay；原点 (5,5)；分桶聚合；仅 hover 列名

**Independent Test**: 开坐标见落点与聚合；悬停见名；点击无额外行为；箱内卡不出现（见 spec US6）

### Implementation for User Story 6

- [x] T037 [P] [US6] Implement SVG `QuadrantView` (origin 5,5; bucket by urgency×importance; radius by count; hover tooltip with scroll or +N; click no-op; close via outside click or explicit control) in `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T038 [US6] Add「坐标视图」entry and overlay wiring for DayView active day cards in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T039 [US6] Add「坐标视图」entry and overlay for AllView active cards (includes unscheduled) in `frontend/src/components/ScheduleViews/AllView.tsx`

**Checkpoint**: US6 — 坐标视图可演示

---

## Phase 9: User Story 7 - 导航与布局体验修正 (Priority: P7)

**Goal**: AI 默认隐藏与按钮态；主题二态文案；创建确认按钮；日/全部 createdAt 排序与 grid 阈值；周/月边距与拥挤；月跨天略宽

**Independent Test**: 对照 spec US7 验收场景逐项勾选

### Implementation for User Story 7

- [x] T040 [P] [US7] Default `chatOpen=false` when no session key in `frontend/src/hooks/useChatPanelLayout.ts`
- [x] T041 [P] [US7] AI button label「AI」with hidden=white / shown=blue (theme vars) in `frontend/src/components/TopBar/TopBar.tsx` (or AppShell toggle)
- [x] T042 [P] [US7] Theme toggle shows only「浅色」/「深色」current name in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T043 [US7] Restore confirm button; keep Enter submit (title required) in `frontend/src/components/cards/CreateCardModal.tsx`
- [x] T044 [US7] Sort Day/All grids by `createdAt` DESC row-major; lower CSS grid `minmax` floor (e.g. target ≤200px) so column count changes sooner than card stretch in `frontend/src/components/ScheduleViews/CardGrid.tsx`, `DayView.tsx`, `AllView.tsx`
- [x] T045 [US7] Month: multi-day cards slightly wider, no cross-cell span; Week keep SpanBar in `frontend/src/components/ScheduleViews/MonthView.tsx` and `WeekView.tsx`
- [x] T046 [US7] Add view container padding; fix left overflow; when a week/month cell has overlapping events use spacing or scroll so labels remain readable (no stacked opacity crush) in `frontend/src/components/ScheduleViews/WeekView.tsx`, `MonthView.tsx`, and layout CSS as needed

**Checkpoint**: US7 — 壳层与布局修正到位

---

## Phase 10: User Story 8 - 创建与修改时间戳在详情可见 (Priority: P8)

**Goal**: 详情小号浅色展示创建/最后修改时间；卡片面不显示

**Independent Test**: 新建可见创建时间；确认保存后 updatedAt 变化；放弃/重置不改（见 spec US8）

### Implementation for User Story 8

- [x] T047 [US8] Format and render `创建时间` / `最后修改时间` (e.g. `2026-0715-1639`) in read-only footer of `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T048 [US8] Ensure content PATCH refreshes `updatedAt` server-side (verify/adjust) in `backend/src/services/schedule.service.ts`; lifecycle ops do not need to bump content updatedAt

**Checkpoint**: US8 — 时间戳仅详情可见

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: 收尾、宪法措辞跟进、quickstart 全量验收

- [x] T049 [P] Remove stale `timeNature`/`deadlineAt`/`PriorityLevel` string usages across backend LLM leftovers if still referenced in `backend/src/services/llm/` (keep AI non-mutating)
- [x] T050 [P] Sync constitution Principle IV wording (已安排/未安排 + 0~10) in `.specify/memory/constitution.md` — **done v1.3.0** (analyze remediation)
- [ ] T051 Run [quickstart.md](./quickstart.md) scenarios A–F and tick SC-001～SC-008
- [ ] T052 Manual regression: AI chat cannot complete/delete/restore cards; session auth still required on new routes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖；T001→T002→T003→T004 必须按序
- **Phase 2.*** (Foundational)**: 依赖 Phase 1；**阻塞**全部用户故事
- **Phase 3–10 (US1–US8)**: 均依赖 Phase 2；建议按优先级顺序，部分前端可并行
- **Phase 11 (Polish)**: 依赖拟交付的故事完成

### User Story Dependencies

| Story | 依赖 | 说明 |
|-------|------|------|
| US1 (P1) | Phase 2 | MVP；可先不做 US5 方框，用详情完成接口手测 |
| US2 (P2) | Phase 2 | 可与 US3 并行（不同控件） |
| US3 (P3) | Phase 2 | PriorityPicker；筛选依赖 US2 AllView 改动时注意合并 |
| US4 (P4) | Phase 2；重叠改 CardDetailModal 时建议在 US1 只读态之后 | 与 US1/US8 同文件须串行或合并提交 |
| US5 (P5) | Phase 2 + US1 生命周期可用 | 依赖 complete API |
| US6 (P6) | Phase 2 + US2/US3 数据形状 | 需要 0~10 与 scheduled 卡集合 |
| US7 (P7) | Phase 2 | 大多独立文件，可早做 AI/主题 |
| US8 (P8) | US4 详情结构更佳 | 可贴在 US4 之后改同一 Modal |

### Parallel Opportunities

- Phase 2: T006 ∥ T015 ∥ T016（类型/前端 API）在 T005/T007–T013 稳定后
- US1: T017 ∥ T018 后接 T019–T022
- US3: T027 可先于 T028–T030
- US5: T034 ∥ 后接 T035/T036
- US6: T037 后接 T038 ∥ T039
- US7: T040–T042 ∥ 可并行；T044–T046 注意同目录冲突

---

## Parallel Example: User Story 1

```bash
# 路由与垃圾箱视图可并行起草：
Task: "Extend ViewMode with trash in ScheduleViewRouter.tsx"
Task: "Create TrashView.tsx"

# 完成后串行接入 TopBar 与详情只读/搜索：
Task: "TopBar trash icon"
Task: "CardDetailModal read-only trash"
Task: "Search merge trash labels"
```

---

## Parallel Example: User Story 6

```bash
Task: "Implement QuadrantView.tsx"
# 然后并行挂入口：
Task: "DayView coordinate entry"
Task: "AllView coordinate entry"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1–2（migrations + lifecycle API）
2. Complete Phase 3 US1（TrashView + TopBar + soft delete/restore/permanent）
3. **STOP and VALIDATE** quickstart 场景 A（及迁移 Smoke）
4. 再增量 US2→US8

### Incremental Delivery

1. Setup + Foundational → API/DB 就绪  
2. US1 → 垃圾箱 MVP  
3. US2 + US3 → 新时间/优先级模型可用  
4. US4 + US8 → 详情体验  
5. US5 → 快捷完成  
6. US6 → 坐标  
7. US7 → 壳层视觉  
8. Polish → quickstart 全绿

### Suggested MVP Scope

**仅 US1 + Phase 1–2**：所有者可完成/删除进箱、恢复、永久删除；常规视图不再出现箱内卡。

---

## Notes

- 截止型迁移：**清空全部时间**（勿实现 setup 草稿「仅留截止」）
- 重名：**仅 active**；箱内释放标题；恢复冲突 409
- 坐标 click：**无额外行为**；悬停可滚动或 +N
- 详情草稿按钮文案：**重置**（非「恢复」）；垃圾箱生命周期仍用「恢复」
- 避免 AI 路径写日程；新路由必须鉴权
- Commit 建议：每个 Phase 或每个 US checkpoint 一次

---

## Phase 12: Convergence

**Purpose**: Close gaps found by `/speckit-converge` against current code vs spec/plan (2026-07-15)

- [x] T053 Stop `CardGrid` from re-sorting trash by `createdAt`; preserve caller `trashedAt` DESC (or trash-only grid) per FR-008 / US1 (contradicts)
- [x] T054 Allow CardDetailModal「确认」when not dirty to close without PATCH per US4/AS2 / FR-015 (partial)
- [x] T055 Show checkmark feedback on CompleteCheckbox click before/while completing per FR-012 / US5 (partial)
- [x] T056 Fix nested button: CardGrid card shell must not wrap CompleteCheckbox button (use div + separate hit targets) per FR-012 / US5 (partial)
- [x] T057 Always show「坐标视图」on Day/All even when zero cards; open empty axes per FR-013 / US6 edge (partial)
- [x] T058 On app load/refresh force AI panel closed (ignore sessionStorage chatOpen, or clear it) per FR-018 / US7 (contradicts)
- [x] T059 Remove or stub writable LLM tool defs/handlers (`create_card`/`update_card`/delete) left in `backend/src/services/llm/tools/` per FR-028 / Constitution III (partial)
- [x] T060 Align frontend end≥start validation with backend (`endAt >= startAt` allowed) in CardFormFields per Edge Cases (partial)
