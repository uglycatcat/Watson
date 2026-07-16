# Tasks: 体验与视觉体系升级

**Input**: Design documents from `/specs/006-ux-visual-upgrade/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 [quickstart.md](./quickstart.md)）

**Organization**: 按用户故事分组；**纯前端**——禁止改动 `backend/**`、drizzle、API、mutationFn/queryKey 逻辑（`useCardMutations` 仅允许 `onSuccess` 加 toast）。

**Clarifications 已锁定**: 简洁+科技感；浅色蓝/深色 NVIDIA 绿；动效 150–250ms；颜色梯度+强度条；艾森豪威尔四象限+轴名；空状态图标级；轻量 toast；后端变更须单列确认。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US11）
- 路径相对于仓库根目录

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认特性指针与边界；栈已存在，无需新建项目

- [x] T001 Confirm feature pointer `specs/006-ux-visual-upgrade` in `.specify/feature.json` and docs layout under `specs/006-ux-visual-upgrade/`
- [x] T002 [P] Verify `git` / workspace boundary: no planned edits under `backend/**` (document in PR notes if needed)

---

## Phase 2: Foundational — Design Token 地基 (Wave 0)

**Purpose**: `index.css` 设计 token + `@theme` 桥接 + `prefers-reduced-motion`——**所有用户故事之前必须完成**

**⚠️ CRITICAL**: 完成本阶段前不得开始壳层/内容组件迁移

- [x] T003 Expand spacing (`--space-1`…`8`), radius (`--radius-sm/md/lg`), shadow (`--shadow-sm/md/lg` light+dark), type scale (`--text-xs`…`2xl`, font-weight tokens) in `frontend/src/index.css`
- [x] T004 Add accent state tokens (`--accent-hover`, `--accent-active`, `--accent-subtle`) for `:root` and `.dark` (keep light `#2563eb` / dark `#76b900`) in `frontend/src/index.css`
- [x] T005 Add motion tokens (`--duration-fast` 150ms, `--duration-normal` 200ms, `--duration-slow` 250ms, `--ease-standard`) and quadrant fill tokens (`--quadrant-q1`…`q4`) in `frontend/src/index.css`（与 T003–T007 同文件，须串行）
- [x] T006 Bridge common tokens via Tailwind `@theme inline` in `frontend/src/index.css`
- [x] T007 Add global `@media (prefers-reduced-motion: reduce)` rule and optional root color transition helpers in `frontend/src/index.css`
- [x] T008 Smoke: open app light/dark — layout intact, no broken pages after token-only change

**Checkpoint**: Token 地基就绪；现有界面无布局崩溃；可开始用户故事

---

## Phase 3: User Story 1 - 全站视觉规范一致 (Priority: P1) 🎯 MVP

**Goal**: 壳层与核心控件消费统一 token（间距/圆角/阴影/字号/强调色状态），延续「简洁 + 科技感」

**Independent Test**: 抽查顶栏、按钮、弹层、登录入口同类控件样式一致；明暗主题强调色正确（quickstart V0）

### Implementation for User Story 1

- [x] T009 [US1] Migrate `frontend/src/components/ui/Modal.tsx` hard-coded radius/shadow/colors to design tokens
- [x] T010 [P] [US1] Migrate `frontend/src/components/ui/Drawer.tsx` to design tokens
- [x] T011 [P] [US1] Migrate `frontend/src/components/ui/ConfirmDialog.tsx` to design tokens
- [x] T012 [US1] Apply tokenized panel/border/radius baseline to `frontend/src/layouts/AppShell.tsx` main surface
- [x] T013 [US1] Replace remaining ad-hoc `rounded-lg` / border colors on shell-adjacent controls in `frontend/src/components/ChatPanel/ChatPanel.tsx` (visual only; chat logic untouched)

**Checkpoint**: US1 MVP — 壳层视觉语言统一；功能行为不变

---

## Phase 4: User Story 2 - 交互过渡与无障碍动效 (Priority: P1)

**Goal**: 主题、弹层、面板、悬停具备 150–250ms 过渡；遵守 `prefers-reduced-motion`

**Independent Test**: 主题切换/弹层开合有过渡；DevTools 开启 reduce-motion 后动效几乎即时且功能可用（quickstart V1）

### Implementation for User Story 2

- [x] T014 [US2] Add theme color transition on `html`/`body` (or root) when toggling `.dark` via `frontend/src/hooks/useTheme.ts` + `frontend/src/index.css`
- [x] T015 [US2] Add enter/exit opacity + translate transitions (200ms) to `frontend/src/components/ui/Modal.tsx`
- [x] T016 [P] [US2] Add open/close transitions to `frontend/src/components/ui/Drawer.tsx`
- [x] T017 [US2] Add ChatPanel open/width transition using motion tokens in `frontend/src/components/ChatPanel/ChatPanel.tsx` (and layout hook only if needed for CSS class)
- [x] T018 [US2] Add short `transition-colors` / interactive hover utility usage on primary shell buttons in `frontend/src/components/TopBar/TopBar.tsx` (behavior props unchanged)
- [x] T019 [US2] Verify reduced-motion: with media query active, Modal/Drawer/theme still usable with near-instant changes

**Checkpoint**: US2 — 动效克制顺滑；无障碍偏好受尊重

---

## Phase 5: User Story 3 - 顶栏三区与分段控件 (Priority: P2)

**Goal**: TopBar 左/中/右三区；视图切换为 SegmentedControl；搜索默认收窄、聚焦可展开

**Independent Test**: 三区可辨；分段仅日/周/月/全部（无 trash）；ViewTimeNav 仍在视图内；搜索宽窄策略生效；005 日期/视图行为不变（quickstart V2）

### Implementation for User Story 3

- [x] T020 [P] [US3] Create `SegmentedControl` (`value`, `options`, `onChange`) in `frontend/src/components/ui/SegmentedControl.tsx`
- [x] T021 [US3] Restructure `frontend/src/components/TopBar/TopBar.tsx` into three zones: brand+search+create | SegmentedControl(day/week/month/all)+AnchorDateControl | actions；**不要**把 `ViewTimeNav` 迁入 TopBar（仍留在 Day/Week/Month 视图内）
- [x] T022 [US3] Replace loose view buttons with `SegmentedControl` for day/week/month/all only（**不含 trash**）in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T023 [US3] Narrow default search width and focus-within expand transition in `frontend/src/components/search/GlobalSearch.tsx` (and TopBar layout constraints)
- [x] T024 [US3] Confirm AnchorDateControl / trash date visibility / all-date-non-filter behavior still matches 005 in `frontend/src/components/TopBar/TopBar.tsx` and `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US3 — 顶栏结构清晰；视图切换质感统一

---

## Phase 6: User Story 4 - 操作区语义分组 (Priority: P2)

**Goal**: 垃圾箱与主题/AI 视觉分组；危险/归档入口与偏好设置区分

**Independent Test**: 右侧可见分隔/分组；点击垃圾箱与主题/AI 行为同 004/005（quickstart V2）

### Implementation for User Story 4

- [x] T025 [US4] Group TopBar right actions: trash isolated; theme + AI in preference group with divider/spacing tokens in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T026 [US4] Align trash/theme/AI button chrome to accent/border tokens without changing handlers in `frontend/src/components/TopBar/TopBar.tsx`

**Checkpoint**: US4 — 操作区语义分组完成

---

## Phase 7: User Story 5 - 卡片优先级可视化与信息层级 (Priority: P2)

**Goal**: PriorityMeter（梯度+强度条）；分类左缘色带；卡片层级与深浅主题抬升

**Independent Test**: 卡片无裸「重要N 紧急N」主展示；色带可见；深色卡片有层次（quickstart V3）

### Implementation for User Story 5

- [x] T027 [P] [US5] Create `getCategoryAccent(categoryId)` in `frontend/src/lib/categoryColor.ts`
- [x] T028 [P] [US5] Create `PriorityMeter` (`label`, `value` 0–10, `showNumber`, `compact`) in `frontend/src/components/cards/PriorityMeter.tsx`
- [x] T029 [US5] Apply left color strip + title/time/tag hierarchy + `PriorityMeter` ×2 in `frontend/src/components/ScheduleViews/CardGrid.tsx` (remove bare importance/urgency text as primary)
- [x] T030 [P] [US5] Apply same visualization hierarchy in `frontend/src/components/ScheduleViews/CardList.tsx`
- [x] T031 [US5] Add card elevation (`--shadow-sm` / panel lift) for light and dark in `CardGrid`/`CardList`
- [x] T032 [US5] Show `PriorityMeter` on `PriorityField` button face (picker list may keep numbers) in `frontend/src/components/cards/PriorityPicker.tsx`

**Checkpoint**: US5 — 优先级一眼可读；卡片信息层级清晰

---

## Phase 8: User Story 6 - 完成勾选控件重设计 (Priority: P3)

**Goal**: CompleteCheckbox 语义清晰、hover 反馈、勾选轻动效；业务语义不变

**Independent Test**: hover/勾选可见；完成后仍走 `completeCard`；reduce-motion 下即时（quickstart V3）

### Implementation for User Story 6

- [x] T033 [US6] Redesign checkbox border/hover/checked styles with accent tokens in `frontend/src/components/cards/CompleteCheckbox.tsx`
- [x] T034 [US6] Add 150ms check/scale animation respecting reduced-motion; keep `completeCard` / disabled / stopPropagation behavior in `frontend/src/components/cards/CompleteCheckbox.tsx`

**Checkpoint**: US6 — 完成控件质感达标

---

## Phase 9: User Story 7 - 优先级坐标图四象限可读化 (Priority: P2)

**Goal**: 四象限淡背景 + 艾森豪威尔标签；轴名「紧急度」「重要度」；原点 (5,5)；明暗可读

**Independent Test**: 日 embedded + 全部 overlay 均见四象限与轴标注；取数/变体行为同 005（quickstart V4）

### Implementation for User Story 7

- [x] T035 [US7] Draw four quadrant rect fills using `--quadrant-q*` and corner labels 立即做/计划做/授权做/减少做 in `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T036 [US7] Strengthen axes + origin (5,5) marker; label axes 「紧急度」「重要度」 in `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T037 [US7] Verify embedded (DayView) and overlay (AllView) share plot visuals without changing filter/variant contracts in `QuadrantView.tsx` / call sites

**Checkpoint**: US7 — 坐标图可理解

---

## Phase 10: User Story 8 - 坐标点标识与稀少数据说明 (Priority: P3)

**Goal**: 点悬停精致 tooltip；少数据轻量说明；无新点击导航

**Independent Test**: hover 见标题+优先级；0～1 点有说明；点击无新行为（quickstart V4）

### Implementation for User Story 8

- [x] T038 [US8] Upgrade hover tooltip to card-style shadow panel with title + compact `PriorityMeter` in `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T039 [US8] Show lightweight empty/sparse-data caption when `cards.length <= 1` in `frontend/src/components/ScheduleViews/QuadrantView.tsx`
- [x] T040 [US8] Ensure click on point/blank still has no navigation (004/005 contract) in `QuadrantView.tsx`

**Checkpoint**: US8 — 点位可读；空疏不误导

---

## Phase 11: User Story 9 - 空状态、骨架与操作反馈 (Priority: P2)

**Goal**: EmptyState + Skeleton 接入各视图/搜索；Toast 在 create/complete/delete/restore/permanent-delete 成功时弹出

**Independent Test**: 无数据视图有图标+文案+主操作；加载见骨架；成功操作有 toast（quickstart V5）

### Implementation for User Story 9

- [x] T041 [P] [US9] Create `EmptyState` (`icon`, `title`, `description`, `action`) in `frontend/src/components/ui/EmptyState.tsx`
- [x] T042 [P] [US9] Create `Skeleton` + `SkeletonCardGrid` (pulse; reduced-motion safe) in `frontend/src/components/ui/Skeleton.tsx`
- [x] T043 [P] [US9] Create `Toast` host + `useToast` / `ToastProvider` in `frontend/src/components/ui/Toast.tsx` and `frontend/src/hooks/useToast.tsx`
- [x] T044 [US9] Mount `ToastProvider` in `frontend/src/App.tsx` or `frontend/src/layouts/AppShell.tsx`
- [x] T045 [US9] Wire `toast.success` only in mutation `onSuccess` callbacks (do not change mutationFn/invalidate) in `frontend/src/hooks/useCardMutations.ts`
- [x] T046 [US9] Replace loading/empty branches with Skeleton/EmptyState in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T047 [P] [US9] Same for `WeekView.tsx` and `MonthView.tsx`
- [x] T048 [P] [US9] Same for `AllView.tsx` and `TrashView.tsx`
- [x] T049 [US9] Search no-results EmptyState compact variant in `frontend/src/components/search/GlobalSearch.tsx` and/or `AppShell` search overlay

**Checkpoint**: US9 — 空状态/骨架/Toast 覆盖主路径

---

## Phase 12: User Story 10 - 拖拽进垃圾箱放置反馈 (Priority: P3)

**Goal**: dragover 时垃圾箱明显激活；松手语义仍同 005

**Independent Test**: 拖入高亮、拖离消退、松手进箱无确认（quickstart V6）

### Implementation for User Story 10

- [x] T050 [US10] Enhance trash drop-target active styles with `--accent-subtle` / outline / scale using tokens in `frontend/src/components/TopBar/TopBar.tsx` (keep existing DnD handlers and `deleteCard`)
- [x] T051 [US10] Confirm drop/leave/cancel still match 005 semantics (no ConfirmDialog on drag-delete) in `TopBar.tsx`

**Checkpoint**: US10 — 放置 affordance 清晰

---

## Phase 13: User Story 11 - 全局排版与登录页 (Priority: P3)

**Goal**: 排版节奏统一；登录页构图、品牌标题、验证码对比与引导文案

**Independent Test**: 登录页平衡、标题克制、Pin 引导可见；鉴权不变（quickstart V7）

### Implementation for User Story 11

- [x] T052 [US11] Apply typography tokens to page titles/body rhythm on login and main shell in `frontend/src/pages/LoginPage.tsx` and shared text styles via `index.css` / AppShell as needed
- [x] T053 [US11] Rebalance LoginPage layout (brand + form + 005 ICP footer); tone down glow/stroke on brand title in `frontend/src/pages/LoginPage.tsx`
- [x] T054 [US11] Improve PinCodeInput contrast + add「请输入四字符验证码」guide in `frontend/src/components/auth/PinCodeInput.tsx` (auth submit logic unchanged)

**Checkpoint**: US11 — 登录第一印象达标

---

## Phase 14: Polish & Cross-Cutting

**Purpose**: 残留硬编码清理、全量回归、零后端 diff

- [x] T055 [P] Sweep remaining hard-coded radii/shadows/accent hex in touched frontend components; prefer tokens
- [x] T059 [P] Tokenize visual chrome (radius/border/spacing/colors only; no validation logic) in `frontend/src/components/cards/CreateCardModal.tsx` and `frontend/src/components/cards/CardFormFields.tsx`
- [x] T060 [P] Tokenize week/month day-chip and `SpanBar` visual chrome only in `frontend/src/components/ScheduleViews/WeekView.tsx`, `MonthView.tsx`, and `frontend/src/components/calendar/SpanBar.tsx` (DnD/handlers unchanged)
- [x] T056 Run [quickstart.md](./quickstart.md) V0–V8 and [005 quickstart](../005-view-nav-drag-time/quickstart.md) regression checklist
- [x] T057 Confirm `git diff --stat` has **no** `backend/` changes; document any accidental touch and revert
- [x] T058 Manual SC-001～SC-008 spot-check；SC-006 至少 **2** 人对照象限标签说出 ≥2 个象限含义（浅/深各看一眼）；其余项：consistency、reduced-motion、empty states、toast、priority viz、regression、login guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖
- **Foundational (Phase 2)**: 依赖 Setup — **阻塞全部用户故事**
- **US1 → US2**: US2 可紧随 US1（同改 Modal/TopBar）；建议先 US1 token 迁移再加过渡
- **US3 → US4**: 均改 TopBar；串行（US3 布局后 US4 分组）
- **US5 → US6**: US6 仅 CompleteCheckbox，可在 US5 后或与 US5 尾部并行
- **US7 → US8**: US8 依赖 US7 的 QuadrantView 结构
- **US9**: 依赖 Foundational；可与 US5–US8 并行（不同文件为主）
- **US10**: 依赖 US3/US4 TopBar 结构；可在其后
- **US11**: 几乎独立；可与中后期并行
- **Polish**: 依赖计划交付的全部故事

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 | Phase 2 | MVP 视觉底座 |
| US2 | Phase 2, ideally US1 Modal token | 动效 |
| US3 | Phase 2 | TopBar 结构 |
| US4 | US3 | 同文件分组 |
| US5 | Phase 2 | 新建 PriorityMeter / categoryColor |
| US6 | Phase 2 | CompleteCheckbox |
| US7 | Phase 2 | QuadrantView |
| US8 | US7 | tooltip / 稀少说明 |
| US9 | Phase 2 | EmptyState / Skeleton / Toast |
| US10 | US3/US4 | 垃圾箱视觉 |
| US11 | Phase 2 | 登录页 |

### Parallel Opportunities

- After Phase 2: **US5** (new files) ∥ **US9** (new ui/toast) ∥ **US11** (login) ∥ **US7** (QuadrantView)
- T027 ∥ T028；T041 ∥ T042 ∥ T043；T047 ∥ T048
- Do **not** parallel US3+US4 or US7+US8 on same file without coordination

---

## Parallel Example: After Foundational

```bash
# Track A — cards
Task: "Create categoryColor.ts"
Task: "Create PriorityMeter.tsx"

# Track B — feedback primitives
Task: "Create EmptyState.tsx"
Task: "Create Skeleton.tsx"
Task: "Create Toast + useToast"

# Track C — login
Task: "LoginPage + PinCodeInput polish"
```

---

## Implementation Strategy

### MVP First (US1 + Foundational)

1. Phase 1 Setup  
2. Phase 2 Token 地基  
3. Phase 3 US1 壳层 token 迁移  
4. **STOP**：抽查明暗主题一致性 → 再扩 US2 动效  

### Incremental Delivery

1. Foundational + US1 → 视觉体系可见  
2. US2 → 质感升级  
3. US3 + US4 → 顶栏完成  
4. US5 + US6 → 卡片完成  
5. US7 + US8 → 坐标图完成  
6. US9 → 空状态/Toast/骨架  
7. US10 + US11 → 拖拽反馈 + 登录  
8. Polish → 全量回归 + 确认无 backend diff  

### Suggested MVP Scope

**Foundational (T003–T008) + User Story 1 (T009–T013)** — 最小可感知「设计体系」增量。

---

## Notes

- [P] = 不同文件且无未完成依赖
- 禁止改 `backend/**`、`mutationFn`、queryKey、鉴权校验、DnD 删除语义
- 若某视觉必须动后端：标 `[BLOCKED: needs backend]` 并停止该子项，单独确认
- 每波结束后对照 quickstart 子集验收
- Commit 建议按 Phase / Story 粒度，避免大爆炸 PR

---

## Phase 15: Convergence

- [x] T061 Apply `--accent-hover` and `--accent-active` to accent-bearing interactive controls (TopBar actions, CardDetailModal 确认, SegmentedControl tab hover, PriorityPicker selected state, etc.) per FR-001 (partial)
- [x] T062 Tokenize visual chrome in `ViewTimeNav.tsx`, `AnchorDateControl.tsx`, and `CardDetailModal.tsx` action buttons (`--radius-md`, `transition-interactive`, border/shadow tokens only) per FR-001 and contracts/ui-components.md (partial)
- [x] T063 Extract Toast portal UI into `frontend/src/components/ui/Toast.tsx`; keep `useToast.tsx` as hook/provider per T043 and contracts/ui-components.md (partial)
