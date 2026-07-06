# Tasks: 日程搜索、编辑增强与视觉重排

**Input**: Design documents from `/specs/003-schedule-search-edit-visual/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 quickstart.md）

**Organization**: 按用户故事分组；**backend + frontend** 均有变更

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US10）
- 路径相对于仓库根目录 `/home/anna/MY_WS/watson`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 迁移文件与分支就绪

- [x] T001 Create Drizzle migration `0001_title_unique_untimed.sql` with title_lower backfill, dedupe rename, UNIQUE index, and nullable time_nature in `backend/drizzle/0001_title_unique_untimed.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema、schedule 业务规则、API 路由、前端 API 类型与共享表单校验——**所有用户故事的前置**

**⚠️ CRITICAL**: 完成本阶段前不得开始用户故事实现

- [x] T002 Update `schedule_cards` schema (title_lower column, nullable time_nature) in `backend/src/db/schema.ts`
- [x] T003 [P] Extend `TimeNature | null` and ScheduleCard DTOs in `backend/src/types.ts`
- [x] T004 Implement `normalizeTitle`, `assertTitleUnique`, untimed create/update validation in `backend/src/services/schedule.service.ts`
- [x] T005 Extend `listAll` with `hasTime` filter and `sort=title|createdAt` (untimed last on time sort) in `backend/src/services/schedule.service.ts`
- [x] T006 Parse `hasTime` and extended `sort` query params; return 409 on title conflict in `backend/src/routes/cards.ts`
- [x] T007 Run `npm run db:migrate -w backend` and verify migration dedupe against local SQLite
- [x] T008 [P] Add `updateCard`, optional `timeNature` on `ScheduleCardInput`, extend `getCards` query types in `frontend/src/lib/api.ts`
- [x] T009 [P] Refactor `validateCardForm` for untimed path and partial-time rejection in `frontend/src/components/cards/CardFormFields.tsx`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - 全局搜索日程标题 (Priority: P1) 🎯 MVP

**Goal**: TopBar 搜索栏；聚焦主视图变暗；标题模糊匹配下拉（最多 8 条、相关度排序）；点击打开详情

**Independent Test**: 输入关键词见即时候选；点击打开 CardDetailModal；Escape 恢复亮度（见 spec US1）

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `searchTitles` with substring/scatter match and relevance scoring in `frontend/src/components/search/titleSearch.ts`
- [x] T011 [P] [US1] Create `GlobalSearch` dropdown component (max 8, empty state, narrow hint) in `frontend/src/components/search/GlobalSearch.tsx`
- [x] T012 [US1] Add search input and wire `GlobalSearch` in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T013 [US1] Add `searchFocused` dim overlay and `onSelectCard` handler in `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US1 可独立验收——全局搜索打开详情，零后端新端点

---

## Phase 4: User Story 2 - 在详情中编辑并保存日程 (Priority: P2)

**Goal**: CardDetailModal 查看 ↔ 编辑两态；保存走 PATCH；校验与创建一致

**Independent Test**: 任意视图打开详情 → 编辑 → 保存后各视图刷新；取消丢弃修改（见 spec US2）

### Implementation for User Story 2

- [x] T014 [US2] Add `updateCard` mutation with `invalidateQueries(["cards"])` in `frontend/src/hooks/useCardMutations.ts`
- [x] T015 [US2] Refactor `CardDetailModal` to view/edit modes reusing `CardFormFields` and PATCH save in `frontend/src/components/cards/CardDetailModal.tsx`

**Checkpoint**: US2 可独立验收——界面编辑已有卡片

---

## Phase 5: User Story 3 - 标题唯一性约束 (Priority: P3)

**Goal**: 创建与编辑拒绝重名（trim + 忽略大小写）；明确 409 提示

**Independent Test**: 重复标题创建/编辑均被拒；编辑自身原标题允许；删除后可复用（见 spec US3）

### Implementation for User Story 3

- [x] T016 [US3] Display 409「标题已存在」inline error preserving form draft in `frontend/src/components/cards/CreateCardModal.tsx`
- [x] T017 [US3] Display 409「标题已存在」inline error on edit save in `frontend/src/components/cards/CardDetailModal.tsx`

**Checkpoint**: US3 可独立验收——前后端重名路径一致（后端见 Phase 2）

---

## Phase 6: User Story 4 - 仅标题必填与无时间卡片 (Priority: P4)

**Goal**: 仅填标题可创建；无时间卡片只在全部视图；选了 timeNature 须填齐时间

**Independent Test**: 仅标题创建成功；日/周/月不可见、全部可见；部分时间拒绝（见 spec US4）

### Implementation for User Story 4

- [x] T018 [US4] Remove default pre-filled timeNature/times on open in `frontend/src/components/cards/CreateCardModal.tsx`
- [x] T019 [US4] Add no-time / clear timeNature UI and untimed display in view mode in `frontend/src/components/cards/CardFormFields.tsx` and `frontend/src/components/cards/CardDetailModal.tsx`

**Checkpoint**: US4 可独立验收——无时间待办式卡片

---

## Phase 7: User Story 5 - 快捷创建 Enter 提交 (Priority: P5)

**Goal**: 标题非空时 Enter 等同提交；IME composition 期间不触发

**Independent Test**: Enter 创建成功无需点按钮；空标题 Enter 不创建（见 spec US5）

### Implementation for User Story 5

- [x] T020 [US5] Bind Enter submit and `compositionstart`/`compositionend` guard on title input in `frontend/src/components/cards/CreateCardModal.tsx`

**Checkpoint**: US5 可独立验收——Enter 快捷创建

---

## Phase 8: User Story 6 - 全部视图筛选与排序增强 (Priority: P6)

**Goal**: 分类/重要度/紧急度/时间性质/有无时间筛选；排序含标题与创建时间

**Independent Test**: 组合 AND 筛选正确；无时间按时间排序置后；空结果有空态（见 spec US6）

### Implementation for User Story 6

- [x] T021 [P] [US6] Add filter toolbar controls (category, importance, urgency, timeNature, hasTime, sort) in `frontend/src/components/ScheduleViews/AllView.tsx`
- [x] T022 [US6] Wire extended `getCards` query params and empty-state copy in `frontend/src/components/ScheduleViews/AllView.tsx`

**Checkpoint**: US6 可独立验收——全部视图多维筛选排序

---

## Phase 9: User Story 7 - AI 助手与日程数据解耦 (Priority: P7)

**Goal**: Chat 纯文本；无工具编排；前端不因 AI 刷新 cards

**Independent Test**: 发送日程 CRUD 意图消息；卡片数量不变；仍收到文本回复（见 spec US7）

### Implementation for User Story 7

- [x] T023 [US7] Remove LLM tool loop; return `affectedCards: []` and `pendingConfirmation: null` in `backend/src/services/chat.service.ts`
- [x] T024 [P] [US7] Replace SYSTEM_PROMPT with general assistant (no schedule tools) in `backend/src/services/llm/tools/definitions.ts`
- [x] T025 [US7] Remove `affectedCards` invalidate and update chat placeholder in `frontend/src/components/ChatPanel/ChatPanel.tsx`

**Checkpoint**: US7 可独立验收——AI 零数据副作用

---

## Phase 10: User Story 8 - 日视图与全部视图网格化卡片 (Priority: P8)

**Goal**: 圆角矩形 + CSS grid 矩阵排列

**Independent Test**: 日/全部视图见网格卡片；点击仍开详情；窄屏自适应换列（见 spec US8）

### Implementation for User Story 8

- [x] T026 [P] [US8] Create `CardGrid` rounded matrix component in `frontend/src/components/ScheduleViews/CardGrid.tsx`
- [x] T027 [US8] Replace `CardList` with `CardGrid` in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T028 [US8] Replace `CardList` with `CardGrid` in `frontend/src/components/ScheduleViews/AllView.tsx`

**Checkpoint**: US8 可独立验收——日/全部网格布局

---

## Phase 11: User Story 9 - 周视图与月视图全屏布局 (Priority: P9)

**Goal**: 周七列圆角铺满；月历网格铺满主区；保留条带与日抽屉

**Independent Test**: 周/月占满主视图；002 条带与 +N 仍可用（见 spec US9）

### Implementation for User Story 9

- [x] T029 [US9] Refactor `WeekView` to seven flex-1 full-height rounded column containers in `frontend/src/components/ScheduleViews/WeekView.tsx`
- [x] T030 [US9] Refactor `MonthView` to flex-1 six-row grid filling main area in `frontend/src/components/ScheduleViews/MonthView.tsx`
- [x] T031 [US9] Add `h-full min-h-0` flex layout chain on `<main>` for calendar views in `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US9 可独立验收——周/月全屏日历

---

## Phase 12: User Story 10 - 深色主题强调色调整 (Priority: P10)

**Goal**: 深色 NVIDIA 绿 `#76b900`；浅色保持原蓝；收敛到 CSS 变量

**Independent Test**: 切换主题后强调色正确；无大面积遗留硬编码蓝（见 spec US10）

### Implementation for User Story 10

- [x] T032 [P] [US10] Set `.dark { --accent: #76b900; }` keeping `:root` blue in `frontend/src/index.css`
- [x] T033 [US10] Replace hardcoded accent colors with `var(--accent)` in `frontend/src/components/TopBar/TopBar.tsx`, `frontend/src/components/calendar/SpanBar.tsx`, and `frontend/src/components/ChatPanel/ChatPanel.tsx`

**Checkpoint**: US10 可独立验收——深色绿强调色

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: 整体验收与 002 回归

- [x] T034 Run all scenarios in `specs/003-schedule-search-edit-visual/quickstart.md` and fix regressions
- [x] T035 [P] Verify 002 behaviors (month drawer, span bars, delete confirm, chat panel layout) still pass after 003 changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 — 立即开始
- **Foundational (Phase 2)**: 依赖 Phase 1 — **阻塞所有用户故事**
- **User Stories (Phase 3–12)**: 均依赖 Foundational 完成
- **Polish (Phase 13)**: 依赖目标用户故事完成

### User Story Dependencies

| 故事 | 依赖 | 说明 |
|------|------|------|
| US1 搜索 | Foundational | 需 cards 缓存；可最先交付 MVP |
| US2 编辑 | Foundational + api updateCard | 可与 US1 并行（不同文件） |
| US3 重名 | Phase 2 后端 + US2/US4 表单 | 前端任务在 Create/Detail Modal |
| US4 无时间 | Foundational validateCardForm | 先于 US5 |
| US5 Enter | US4 CreateCardModal | 同文件，US4 后 |
| US6 筛选 | Phase 2 listAll 扩展 | 可与 US1/US7 并行 |
| US7 AI | Foundational | 后端+前端，可与其他故事并行 |
| US8 网格 | US6 可选（AllView 同文件） | **US6 完成后**再改 AllView 网格，或同 PR 顺序 T022→T028 |
| US9 全屏 | 无硬依赖 | 可与 US8 并行（Week/Month vs Day/All） |
| US10 主题 | 无硬依赖 | 建议最后，避免与布局 PR 冲突 |

### Within Each User Story

- 后端规则（Phase 2）先于依赖它的前端故事
- 共享 `CardFormFields`：Foundational T009 → US4 T019 → US2 T015
- `AllView.tsx`：US6（T021–T022）先于 US8（T028）

### Parallel Opportunities

**Phase 2 可并行**:
```bash
T003 types.ts ∥ T008 api.ts ∥ T009 CardFormFields.tsx
# T004–T005 schedule.service 串行；T002 schema 先于 T004
```

**Foundational 完成后可并行**:
```bash
Developer A: US1 (T010–T013) — 搜索
Developer B: US7 (T023–T025) — AI 解耦
Developer C: US2+US3 (T014–T017) — 编辑+重名 UI
```

**US8 + US9 可并行**:
```bash
T026 CardGrid.tsx ∥ T029 WeekView.tsx ∥ T030 MonthView.tsx
```

---

## Parallel Example: User Story 1

```bash
# 并行启动搜索核心与 UI 壳：
Task T010: "searchTitles in frontend/src/components/search/titleSearch.ts"
Task T011: "GlobalSearch in frontend/src/components/search/GlobalSearch.tsx"
# 完成后串行：
Task T012: TopBar wiring
Task T013: AppShell overlay
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup + Phase 2 Foundational（必须）
2. Phase 3 US1 全局搜索
3. **STOP and VALIDATE** quickstart §3.1
4. 再按 P2→P10 增量交付

### Incremental Delivery（推荐顺序）

1. Foundational → **US1 搜索**（MVP）
2. **US4 无时间** + **US5 Enter** + **US3 重名 UI**（创建路径闭环）
3. **US2 编辑**（写路径闭环）
4. **US6 筛选** → **US7 AI 解耦**
5. **US8 网格** → **US9 全屏** → **US10 主题**
6. Polish quickstart 全量验收

### Suggested MVP Scope

- **Minimum**: Phase 1 + Phase 2 + **US1**（搜索打开详情）
- **Recommended first release**: MVP + US4/US5/US3（仅标题创建 + 重名 + Enter）

---

## Notes

- 后端改动集中在 Phase 2 与 US7；前端其余为 US1–US6、US8–US10
- 重名 migration 若本地 DB 有重复，会自动 rename 为 `标题 (2)` 等——验收前可查全部视图
- DeepSeek 无需新 env 变量；沿用 `LLM_PROVIDER=deepseek`
- `AllView.tsx` 被 US6 与 US8 共同修改，避免并行冲突
- 每完成一个 **Checkpoint** 可对照 `quickstart.md` 对应小节验收
