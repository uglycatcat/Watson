# Tasks: 日程可视化与手动操作增强

**Input**: Design documents from `/specs/002-schedule-visual-manual-ops/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 quickstart.md）

**Organization**: 按用户故事分组；**仅 `frontend/src` 有代码变更，后端零改动**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US6）
- 路径相对于仓库根目录 `/home/anna/MY_WS/watson`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 002 新增前端依赖

- [x] T001 Add `date-fns-tz` dependency to frontend workspace in `frontend/package.json` and run `npm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: UI 基元、API mutation 封装、时区工具——**所有用户故事的前置**

**⚠️ CRITICAL**: 完成本阶段前不得开始用户故事实现

- [x] T002 [P] Create portal-based `Modal` component (overlay, Esc, centered panel) in `frontend/src/components/ui/Modal.tsx`
- [x] T003 [P] Create slide-in `Drawer` component with `side: left | right` in `frontend/src/components/ui/Drawer.tsx`
- [x] T004 [P] Create `ConfirmDialog` component with title/message/confirm/cancel in `frontend/src/components/ui/ConfirmDialog.tsx`
- [x] T005 [P] Create `ResizeHandle` col-resize pointer component in `frontend/src/components/ui/ResizeHandle.tsx`
- [x] T006 Extend `createCard`, `deleteCard`, `getCardById` and `ScheduleCardInput` type in `frontend/src/lib/api.ts`
- [x] T007 Implement `useCardMutations` hook with create/delete and `invalidateQueries(["cards"])` in `frontend/src/hooks/useCardMutations.ts`
- [x] T008 Implement timezone helpers (`todayInTz`, `formatDayInTz`, read from preferences) in `frontend/src/components/calendar/tz.ts`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - 查看卡片详情并从界面删除 (Priority: P1) 🎯 MVP

**Goal**: 任意视图点击卡片打开居中详情 Modal；删除经二次确认后调用既有 DELETE API

**Independent Test**: 点击卡片见完整字段；确认删除后卡片从各视图消失；取消则不删（见 spec US1）

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `CardDetailModal` displaying title, timeNature, times, importance, urgency, category, description in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T010 [US1] Wire delete flow with `ConfirmDialog` (message includes card title) and `useCardMutations.deleteCard` in `frontend/src/components/cards/CardDetailModal.tsx`
- [x] T011 [US1] Add `onCardClick` prop and clickable card rows in `frontend/src/components/ScheduleViews/CardList.tsx`
- [x] T012 [US1] Lift `selectedCard` state and render `CardDetailModal` in `frontend/src/layouts/AppShell.tsx`
- [x] T013 [US1] Pass `onCardClick` from `DayView.tsx` and `AllView.tsx` through to `CardList.tsx`

**Checkpoint**: US1 可独立验收——日视图/全部视图点击卡片可查看详情并删除

---

## Phase 4: User Story 2 - 月视图日历网格浏览 (Priority: P2)

**Goal**: 月视图按周日期网格展示；跨日条带；格内 ≤3 张 +「+N」；日列表侧滑 Drawer

**Independent Test**: 切换月视图见网格非列表；跨日卡片见跨格条带；点击 +N 打开 Drawer 列全日卡片（见 spec US2）

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement `buildMonthGrid` (Mon-start weeks, inMonth flags, today) in `frontend/src/components/calendar/monthGrid.ts`
- [x] T015 [P] [US2] Implement card-to-day assignment and multi-day span metadata in `frontend/src/components/calendar/cardPlacement.ts`
- [x] T016 [P] [US2] Implement greedy lane assignment for span bars in `frontend/src/components/calendar/spanLayout.ts`
- [x] T017 [P] [US2] Create clickable `SpanBar` component for cross-cell events in `frontend/src/components/calendar/SpanBar.tsx`
- [x] T018 [US2] Create `DayScheduleDrawer` (left Drawer, full day card list) in `frontend/src/components/ScheduleViews/DayScheduleDrawer.tsx`
- [x] T019 [US2] Refactor `MonthView.tsx` with CSS grid, cell chips (max 3 + +N), span bar layer, drawer, and `onCardClick` to open `CardDetailModal`

**Checkpoint**: US2 可独立验收——月历网格、条带、日抽屉与详情 Modal 叠层

---

## Phase 5: User Story 3 - 周视图按日分列浏览 (Priority: P3)

**Goal**: 周一至周日七列；跨列条带；空列提示；周导航

**Independent Test**: 周视图七列布局；跨日卡片跨列条带；上一周/下一周/本周切换正确（见 spec US3）

### Implementation for User Story 3

- [x] T020 [P] [US3] Implement `buildWeekColumns` (Mon–Sun headers and date keys) in `frontend/src/components/calendar/weekGrid.ts`
- [x] T021 [US3] Refactor `WeekView.tsx` with seven-column layout, column chips, span bars, empty column state, and card click handlers
- [x] T022 [US3] Add prev/next/today week navigation toolbar in `frontend/src/components/ScheduleViews/WeekView.tsx`

**Checkpoint**: US3 可独立验收——周视图日历化，与月视图条带语义一致

---

## Phase 6: User Story 4 - 手动创建日程 (Priority: P4)

**Goal**: TopBar「+」打开创建 Modal；表单提交 POST /api/cards；默认值与校验对齐 001

**Independent Test**: 点击 + 填必填项提交后当前视图立即可见新卡片；无效时间拒绝（见 spec US4）

### Implementation for User Story 4

- [x] T023 [P] [US4] Create `CardFormFields` (title, timeNature, times, importance, urgency, category, description) in `frontend/src/components/cards/CardFormFields.tsx`
- [x] T024 [US4] Create `CreateCardModal` with validation, categories query, and `useCardMutations.createCard` in `frontend/src/components/cards/CreateCardModal.tsx`
- [x] T025 [US4] Add「+」button and wire `CreateCardModal` open state in `frontend/src/components/TopBar/TopBar.tsx` and `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US4 可独立验收——不经过对话即可手动创建日程

---

## Phase 7: User Story 5 - AI 助手栏显示/隐藏与宽度调整 (Priority: P5)

**Goal**: 顶部常驻侧栏开关；sessionStorage 显隐；localStorage 宽度；可拖拽分隔条

**Independent Test**: 隐藏后主区全宽；同会话刷新保持隐藏；新会话恢复显示；拖拽宽度刷新后恢复（见 spec US5）

### Implementation for User Story 5

- [x] T026 [US5] Implement `useChatPanelLayout` (sessionStorage `watson:chatOpen`, localStorage `watson:chatPanelWidth`, clamp 280–560px) in `frontend/src/hooks/useChatPanelLayout.ts`
- [x] T027 [US5] Refactor `AppShell.tsx` to use dynamic aside width, `ResizeHandle`, and `useChatPanelLayout` instead of fixed `useState` chatOpen
- [x] T028 [US5] Expose chat toggle on all breakpoints (remove `md:hidden`) in `frontend/src/components/TopBar/TopBar.tsx`

**Checkpoint**: US5 可独立验收——侧栏显隐与调宽符合 FR-009–011

---

## Phase 8: User Story 6 - 主题偏好明/暗二选一 (Priority: P6)

**Goal**: 主题仅 light/dark 切换；读取 system 归一化为 light；PATCH 仅写 light/dark

**Independent Test**: 点击主题只在明暗间切换；历史 system 用户可正常切换 dark（见 spec US6）

### Implementation for User Story 6

- [x] T029 [US6] Refactor `useTheme.ts` to `toggleTheme` two-state only and normalize `system` → `light` on read in `frontend/src/hooks/useTheme.ts`
- [x] T030 [US6] Update theme button in `TopBar.tsx` to use `toggleTheme` and reflect light/dark labels/icons only

**Checkpoint**: US6 可独立验收——无「跟随系统」选项

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨视图收尾与整体验收

- [x] T031 [P] Replace `todayStr()` with timezone-aware helper from `calendar/tz.ts` in `frontend/src/components/ScheduleViews/ScheduleViewRouter.tsx`
- [x] T032 [P] Add empty-state messaging when no cards in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T033 Verify `MonthView.tsx` drawer + modal stacking: closing modal keeps drawer open per spec edge case
- [x] T034 Run manual validation scenarios from `specs/002-schedule-visual-manual-ops/quickstart.md`
- [x] T035 Confirm zero backend file changes with `git diff backend/` (002 scope guard)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 — 立即开始
- **Foundational (Phase 2)**: 依赖 Phase 1 — **阻塞所有用户故事**
- **User Stories (Phase 3–8)**: 均依赖 Foundational 完成
  - 推荐顺序：US1 → US2 → US3 → US4 → US5 → US6（按 spec 优先级）
  - US5/US6 可与 US2–US4 并行（不同文件），但 US1 应先于 US2/3（详情 Modal 被网格复用）
- **Polish (Phase 9)**: 依赖目标用户故事完成

### User Story Dependencies

| Story | 依赖 | 说明 |
|-------|------|------|
| US1 (P1) | Foundational | 无其他故事依赖；**MVP 起点** |
| US2 (P2) | Foundational + US1 详情 Modal | 网格/抽屉点击打开 CardDetailModal |
| US3 (P3) | Foundational + US1 | 周视图复用 SpanBar 与详情 |
| US4 (P4) | Foundational | 可与 US1 并行；TopBar + 按钮与 US5 同文件需注意合并 |
| US5 (P5) | Foundational | 与 US4 共享 TopBar/AppShell，建议 US4 后或协调同一 PR |
| US6 (P6) | Foundational | 独立；可与 US5 同批改 TopBar |

### Within Each User Story

- calendar 工具函数 → 视图组件 → AppShell/TopBar 集成
- Modal/Drawer 基元（Foundational）→ 业务 Modal（US1/US4/US2）

### Parallel Opportunities

- **Phase 2**: T002–T005 四个 ui 组件可并行；T006–T008 在 T001 后并行
- **US2**: T014–T017 可并行后汇合到 T018–T019
- **US4**: T023 与 US1 的 T009 可并行（不同文件）
- **US5 + US6**: T029–T030 与 T026–T028 不同 hook/文件，TopBar 合并时需串行

---

## Parallel Example: User Story 2

```bash
# 并行实现日历工具层：
T014: frontend/src/components/calendar/monthGrid.ts
T015: frontend/src/components/calendar/cardPlacement.ts
T016: frontend/src/components/calendar/spanLayout.ts
T017: frontend/src/components/calendar/SpanBar.tsx

# 汇合后：
T018: DayScheduleDrawer.tsx
T019: MonthView.tsx refactor
```

---

## Parallel Example: Foundational

```bash
# UI 基元四人并行：
T002: ui/Modal.tsx
T003: ui/Drawer.tsx
T004: ui/ConfirmDialog.tsx
T005: ui/ResizeHandle.tsx

# API + hooks 并行：
T006: lib/api.ts
T007: hooks/useCardMutations.ts
T008: calendar/tz.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup（T001）
2. Complete Phase 2: Foundational（T002–T008）
3. Complete Phase 3: User Story 1（T009–T013）
4. **STOP and VALIDATE**: quickstart §3.5 卡片详情与删除
5. Demo：日视图/全部视图可点卡片删改查（删）

### Incremental Delivery

1. Setup + Foundational → 基元就绪
2. US1 → 详情/删除（MVP）
3. US2 → 月视图网格 + 日抽屉
4. US3 → 周视图
5. US4 → 手动创建
6. US5 + US6 → 侧栏与主题
7. Polish → quickstart 全量验收

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3（T001–T013）** — 共 13 项任务，交付「点击卡片查看详情 + 界面删除」，后端零改动。

---

## Notes

- 所有任务仅触及 `frontend/src/**`；T035 确认 `backend/` 无 diff
- `[P]` 任务避免同文件冲突（TopBar/AppShell 为共享集成点）
- 删除二次确认文案 MUST 含卡片标题（FR-002）
- 助手栏宽度 localStorage、显隐 sessionStorage — 勿写入 preferences API
- 月视图日 Drawer 在左缘，AI 助手栏在右缘，避免职责混淆

---

## Task Summary

| Phase | Tasks | IDs |
|-------|-------|-----|
| Setup | 1 | T001 |
| Foundational | 7 | T002–T008 |
| US1 详情删除 P1 | 5 | T009–T013 |
| US2 月视图 P2 | 6 | T014–T019 |
| US3 周视图 P3 | 3 | T020–T022 |
| US4 手动创建 P4 | 3 | T023–T025 |
| US5 侧栏 P5 | 3 | T026–T028 |
| US6 主题 P6 | 2 | T029–T030 |
| Polish | 5 | T031–T035 |
| **Total** | **35** | T001–T035 |

---

## Phase 10: Convergence

- [x] T036 Reset `CardDetailModal` delete confirm state when modal closes or `card.id` changes; surface `deleteError` on failed delete per FR-002 (partial)
- [x] T037 Initialize and sync `AppShell` `anchorDate` from `preferences.timezone` via `useTodayStr()` instead of hardcoded `todayStr()` per plan:TZ (partial)
- [x] T038 Render cross-day `SpanBar` title text only in the start column/cell segment; continuation segments show color bar without repeated title per FR-004a and FR-005a (partial)
- [x] T039 Wire `WeekView`「+N 更多」to open `DayScheduleDrawer` with full day list (reuse month pattern) so delete-from-list edge case applies per edge case §142 (partial)
- [x] T040 Fix `MonthView` span bar vs chip z-index/stacking so overlapping span bars and chips remain independently clickable per edge case §136 (partial)
- [x] T041 Remove unused `api.getCardById` or integrate it where detail fetch is needed per contracts/api-usage (unrequested)
