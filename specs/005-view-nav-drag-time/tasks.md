# Tasks: 视图导航、拖拽归档与时间模型收紧

**Input**: Design documents from `/specs/005-view-nav-drag-time/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 [quickstart.md](./quickstart.md)）

**Organization**: 按用户故事分组；**触及后端**仅时间校验/可选 backfill；其余纯前端。澄清：改开始时仅在结束空或 &lt; 新开始时重补 +24h；可拖来源含日/全部卡、周/月芯片、SpanBar（不含搜索候选）；触摸/粗指针不强制 DnD（见 spec Clarifications）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US6）
- 路径相对于仓库根目录

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本轮目录与 migration 登记就绪（栈已存在，无需新建项目）

- [x] T001 Confirm feature pointer / docs layout for `005-view-nav-drag-time` in `.specify/feature.json` and `specs/005-view-nav-drag-time/`
- [x] T002 [P] Create empty drag-trash helper module scaffold in `frontend/src/components/dnd/dragTrash.ts` (MIME/constants only; logic in US2)
- [x] T003 Create data-only backfill migration stub `backend/drizzle/0005_backfill_end_at.sql` and register in `backend/drizzle/meta/_journal.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 宪法对齐 + 后端时间权威规则 + 历史兜底——**US1 之前必须完成**

**⚠️ CRITICAL**: 完成本阶段前不得开始依赖新时间语义的 UI（US1）；US2–US6 可在其后并行，但 US1 应优先

- [x] T004 [P] Sync constitution Principle IV to scheduled = both start and end (v1.3.1) in `.specify/memory/constitution.md` *(analyze C1 — already applied)*
- [x] T005 Rewrite `resolveTime` for three cases (both null; end-only→start=now/createdAt; start-only→end=start+24h; both→end≥start) in `backend/src/services/schedule.service.ts`
- [x] T006 Align create/update to call new `resolveTime` (create end-only uses `nowIso()`; update end-only uses `existing.createdAt`) and reject illegal intervals with 400 in `backend/src/services/schedule.service.ts`
- [x] T007 Update `scheduled` filter / range helpers to treat scheduled as start **and** end non-null in `backend/src/services/schedule.service.ts`
- [x] T008 Implement backfill SQL/TS so rows with start and null end get `end = start + 24h` (align with JS ms) in `backend/drizzle/0005_backfill_end_at.sql` (and migrate runner if needed)
- [x] T009 Run backend migrate / smoke: create end-only, start-only, both-null; confirm no persistable start-without-end in local SQLite

**Checkpoint**: 宪法已对齐；API 三种时间态正确；历史仅开始行已补齐结束

---

## Phase 3: User Story 1 - 时间填写三种互斥情形 (Priority: P1) 🎯 MVP

**Goal**: 表单与校验与后端一致——未安排 / 只填结束 / 起止齐全；禁止「有开始无结束」

**Independent Test**: 三种路径保存；只填结束→开始=创建/现在；填开始→结束+24h；改开始保留合法结束；历史卡有结束（见 spec US1 / quickstart V1）

### Implementation for User Story 1

- [x] T010 [US1] Remove end-field `disabled={!values.startAt}` and reverse validate rules (allow end-only; forbid final start-without-end) in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T011 [US1] Auto-fill end = start+24h on first start; on start change only refill when end empty or end &lt; new start (clarification B) in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T012 [US1] Update `validateCardForm` / `formValuesToInput` for end-only submit (omit/null start for create; pass end) and both-null unscheduled in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T013 [US1] Wire create/detail save paths to new helpers (pass `createdAt` when editing end-only if FE pre-fills start) in `frontend/src/components/cards/CreateCardModal.tsx` and `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T014 [US1] Surface API 400 time errors as inline form messages in create/detail flows in `frontend/src/components/cards/CreateCardModal.tsx` and `frontend/src/components/cards/CardDetailModal.tsx`

**Checkpoint**: US1 MVP — 三种互斥时间态可用且与日历过滤一致

---

## Phase 4: User Story 2 - 拖拽卡片到垃圾箱归档 (Priority: P2)

**Goal**: 桌面 HTML5 DnD → TopBar 垃圾箱 soft-delete，无确认；详情删除仍确认；触摸降级；失败可恢复

**Independent Test**: 从日/周/月/全部拖卡到垃圾箱进箱无确认；详情删除仍确认；搜索候选不可拖；失败时卡仍活跃（见 spec US2 / FR-005b / quickstart V2）

### Implementation for User Story 2

- [x] T015 [P] [US2] Implement drag payload helpers (`application/x-watson-card`, set/get cardId) in `frontend/src/components/dnd/dragTrash.ts`
- [x] T016 [US2] Make TopBar trash icon an enlarged drop target (extra padding/hit box; `onDragOver`/`onDrop` → `deleteCard`, highlight while over) with no ConfirmDialog; keep detail-delete ConfirmDialog unchanged in `frontend/src/components/TopBar/TopBar.tsx` and `frontend/src/components/cards/CardDetailModal.tsx` (reuse `frontend/src/hooks/useCardMutations.ts`)
- [x] T017 [P] [US2] Add `draggable` + dragStart on CardGrid active cards in `frontend/src/components/ScheduleViews/CardGrid.tsx`
- [x] T018 [P] [US2] Add draggable to week/month day chips in `frontend/src/components/ScheduleViews/WeekView.tsx` and `frontend/src/components/ScheduleViews/MonthView.tsx`
- [x] T019 [P] [US2] Add draggable to `SpanBar` in `frontend/src/components/calendar/SpanBar.tsx`
- [x] T020 [US2] Ensure GlobalSearch candidates remain non-draggable and trash view items cannot drag-delete in `frontend/src/components/search/GlobalSearch.tsx` / `TrashView.tsx` as needed
- [x] T021 [US2] Touch/coarse-pointer degrade: trash icon `title` hint「桌面可拖入删除」; no touch DnD impl in `frontend/src/components/TopBar/TopBar.tsx` (spec Clarifications)
- [x] T022 [US2] Ensure drag-delete failure shows error toast and rolls back / invalidates so card stays active (FR-005b) in `frontend/src/hooks/useCardMutations.ts` and TopBar drop handler

**Checkpoint**: US2 — 桌面拖拽进箱；详情确认删除不变；失败可恢复

---

## Phase 5: User Story 3 - 日/月时间导航与导航栏日期控件修复 (Priority: P3)

**Goal**: ViewTimeNav 日/周/月；AnchorDateControl 不可清空 + 回到今天；all 显示日期但不滤列表；trash 隐藏

**Independent Test**: 日±1/今天、月±1/本月；日期不可清空；all 改日期列表不变；trash 无日期控件（见 spec US3 / quickstart V3）

### Implementation for User Story 3

- [x] T023 [P] [US3] Create `ViewTimeNav` (`grain: day|week|month`, date-fns add/sub, 今天/本周/本月) in `frontend/src/components/ScheduleViews/ViewTimeNav.tsx`
- [x] T024 [US3] Wire ViewTimeNav into DayView (±1 day + 今天) in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T025 [US3] Wire ViewTimeNav into MonthView (±1 month + 本月) in `frontend/src/components/ScheduleViews/MonthView.tsx`
- [x] T026 [US3] Migrate WeekView existing week pager to ViewTimeNav (上一周/本周/下一周) in `frontend/src/components/ScheduleViews/WeekView.tsx`
- [x] T027 [P] [US3] Create non-clearable `AnchorDateControl` +「回到今天」in `frontend/src/components/TopBar/AnchorDateControl.tsx`
- [x] T028 [US3] Replace native date input; show when `view !== "trash"` (include `all`); drop `view === "all"` hide in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T029 [US3] Guard `anchorDate` never empty in `frontend/src/layouts/AppShell.tsx`; confirm AllView does not filter by `anchorDate` in `frontend/src/components/ScheduleViews/AllView.tsx`

**Checkpoint**: US3 — 日/周/月导航对等；日期控件不可清空

---

## Phase 6: User Story 4 - 日视图常驻优先级坐标图 (Priority: P4)

**Goal**: DayView 左日程 + 右凹陷方框常驻坐标；移除日视图按钮；AllView 仍按钮弹出

**Independent Test**: 日视图右侧常驻坐标、无按钮；全部仍按钮弹出（见 spec US4 / quickstart V4）

### Implementation for User Story 4

- [x] T030 [US4] Add `variant: "overlay" | "embedded"` (embedded: no dismiss overlay) to `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T031 [US4] Refactor DayView to left CardGrid + right inset rounded square with embedded QuadrantView; remove day「坐标视图」button in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T032 [US4] Keep AllView button → overlay QuadrantView unchanged in `frontend/src/components/ScheduleViews/AllView.tsx`
- [x] T033 [US4] Ensure narrow layout stacks or shrinks right panel without hiding quadrant in `frontend/src/components/ScheduleViews/DayView.tsx`

**Checkpoint**: US4 — 日视图常驻坐标；全部弹出式保留

---

## Phase 7: User Story 5 - 登录页备案占位 (Priority: P5)

**Goal**: LoginPage 底部备案占位区；主题适配；无真实备案号

**Independent Test**: 登录页底见占位；明暗主题不破坏（见 spec US5 / quickstart V5）

### Implementation for User Story 5

- [x] T034 [US5] Add fixed/min-height footer placeholder (neutral copy or empty slots) on `frontend/src/pages/LoginPage.tsx`
- [x] T035 [US5] Theme-adapt placeholder styles (light/dark CSS variables) in `frontend/src/pages/LoginPage.tsx`

**Checkpoint**: US5 — 备案占位可见且不破坏登录

---

## Phase 8: User Story 6 - 周/月视图视觉收紧 (Priority: P6)

**Goal**: 周/月底留白；SpanBar 粗细×2.5、顶端略下移、间隔对齐；不破坏单元格内滚动

**Independent Test**: 目视周框/月底留白、长条约 2.5× 与顶端下移（见 spec US6 / quickstart V5）

### Implementation for User Story 6

- [x] T036 [US6] Increase `LANE_HEIGHT` ~×2.5 and slight topOffset downshift in `frontend/src/components/calendar/SpanBar.tsx`
- [x] T037 [US6] Adjust week day cell padding/height / bottom whitespace in `frontend/src/components/ScheduleViews/WeekView.tsx`
- [x] T038 [US6] Adjust month grid bottom padding / last-row breathing room in `frontend/src/components/ScheduleViews/MonthView.tsx`
- [x] T039 [US6] Smoke-check week vertical crowding still ok (cell `overflow-y-auto` retained) in WeekView + SpanBar

**Checkpoint**: US6 — 视觉收紧达标

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事验收

- [ ] T040 Run manual validation scenarios V1–V5 in `specs/005-view-nav-drag-time/quickstart.md` (include V2 detail-confirm + failure + touch degrade)
- [ ] T041 [P] Spot-check dark/light + trash + all date control interactions across TopBar / DayView / LoginPage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup；含修宪 T004（已完成）与后端时间；**阻塞 US1**
- **US1 (Phase 3)**: 依赖 Phase 2 → **MVP**
- **US2–US6 (Phases 4–8)**: 依赖 Phase 2；彼此可并行（注意 DayView：US3 导航 + US4 布局同文件，宜串行或一人负责）
- **Polish (Phase 9)**: 依赖拟交付故事完成

### User Story Dependencies

| Story | 依赖 | 说明 |
|-------|------|------|
| US1 P1 | Phase 2 | 无其他故事依赖 |
| US2 P2 | Phase 2 | 复用既有 deleteCard；与 US1 独立可测 |
| US3 P3 | Phase 2 | 与 US1 独立；与 US4 争用 DayView |
| US4 P4 | Phase 2 | 建议在 US3 DayView 导航接入后改布局，或合并提交 |
| US5 P5 | 无 | 仅 LoginPage，可随时并行 |
| US6 P6 | 无强依赖 | 注意与 US2 SpanBar draggable 同文件时序 |

### Parallel Opportunities

- T002 ∥ T003（Setup）
- T015 ∥ T017 ∥ T018 ∥ T019（US2 不同文件）
- T023 ∥ T027（US3 导航 vs 日期控件）
- T034–T035 可与任意 US 并行（US5）
- T036–T038 在 SpanBar/Week/Month 无冲突时可部分并行
- US5 全程可与 US2/US3/US4 并行

---

## Parallel Example: User Story 2

```bash
# 不同文件可并行：
Task: "Implement drag payload helpers in frontend/src/components/dnd/dragTrash.ts"
Task: "Add draggable on CardGrid in frontend/src/components/ScheduleViews/CardGrid.tsx"
Task: "Add draggable on SpanBar in frontend/src/components/calendar/SpanBar.tsx"
Task: "Add draggable chips in WeekView.tsx and MonthView.tsx"

# 串行收尾：
Task: "TopBar enlarged trash drop target → deleteCard in TopBar.tsx"
Task: "Drag-delete failure toast / rollback in useCardMutations.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Create ViewTimeNav.tsx"
Task: "Create AnchorDateControl.tsx"
# then wire Day/Week/Month + TopBar + AppShell
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup  
2. Phase 2 Foundational（修宪已完成 + 后端时间 + backfill）  
3. Phase 3 US1 表单  
4. **STOP**：按 quickstart V1 验收  

### Incremental Delivery

1. Setup + Foundational → 时间 API 正确  
2. US1 → MVP  
3. US2 拖拽进箱  
4. US3 导航与日期控件  
5. US4 日视图坐标  
6. US5 登录占位 ∥ US6 视觉  
7. Polish + quickstart 全量  

### Parallel Team Strategy

- A: Phase 2 + US1  
- B: US2 + US6（SpanBar 协调）  
- C: US3 + US4（DayView 单人）  
- D: US5  

---

## Notes

- [P] = 不同文件、无未完成依赖  
- 无新 REST 端点；拖拽 = 既有软删  
- DayView 同时涉及 US3/US4：避免两人同改  
- 触摸/粗指针不实现拖拽：详情删除仍确认（spec Clarifications / FR-005）  
- 提交节奏：每故事或逻辑组一次；勿空提交  
- analyze 修复：C1→T004 已勾选；I1→spec；O1→修宪前置；U1/U2→T016/T022  

---

## Phase 10: Convergence

**Purpose**: 收敛实现与规格/计划之间的剩余缺口（`/speckit-converge`）

- [x] T042 Wire owner `preferences.timezone` into TopBar `AnchorDateControl` so「回到今天」matches ViewTimeNav「今天/本周/本月」per FR-009 / US3/AC5 (`partial`)
