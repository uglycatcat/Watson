# Tasks: 对话式日程管理

**Input**: Design documents from `/specs/001-conversational-scheduling/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 规格未要求 TDD；本清单不含独立测试任务（验收见 quickstart.md）。

**Organization**: 按用户故事分组，支持独立实现与验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1–US5）
- 路径相对于仓库根目录 `/home/anna/MY_WS/watson`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo 脚手架与开发工具链

- [x] T001 Create npm workspaces root with scripts (`dev`, `build`, `start`, `watson:init`) in `package.json`
- [x] T002 [P] Initialize backend workspace with Fastify, Drizzle, better-sqlite3, bcrypt, Zod deps in `backend/package.json`
- [x] T003 [P] Initialize frontend workspace with React 19, Vite 6, TanStack Query, Tailwind, date-fns in `frontend/package.json`
- [x] T004 [P] Add redacted `config.example.yaml` and `.env.example` at repository root
- [x] T005 Update `.gitignore` for `data/`, `config.yaml`, `.env`, `node_modules/`, `frontend/dist/`
- [x] T006 [P] Configure ESLint and Prettier for backend and frontend in `eslint.config.js`
- [x] T007 [P] Add TypeScript configs in `backend/tsconfig.json` and `frontend/tsconfig.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 数据库、配置、Fastify 骨架、鉴权中间件、LLM 抽象——**所有用户故事的前置**

**⚠️ CRITICAL**: 完成本阶段前不得开始用户故事实现

- [x] T008 Define Drizzle schema (categories, schedule_cards, owner_preferences, chat_sessions, chat_messages) in `backend/src/db/schema.ts`
- [x] T009 Create `backend/drizzle.config.ts` and initial SQL migration in `backend/drizzle/0001_initial.sql`
- [x] T010 Implement DB connection, WAL mode, and startup migrate in `backend/src/db/migrate.ts`
- [x] T011 Implement Zod-validated config loader (yaml + env overlay) in `backend/src/config/index.ts`
- [x] T012 Implement Fastify app bootstrap and plugin registration in `backend/src/index.ts`
- [x] T013 [P] Implement global error handler without secret leakage in `backend/src/middleware/error-handler.ts`
- [x] T014 Implement `@fastify/secure-session` and auth guard middleware in `backend/src/middleware/auth.ts`
- [x] T015 [P] Define LLMProvider interface in `backend/src/services/llm/provider.ts`
- [x] T016 [P] Implement OpenAI-compatible LLM adapter in `backend/src/services/llm/openai-compatible.ts`
- [x] T017 Implement token generation CLI (`watson:init`) storing bcrypt hash in `backend/src/cli/init.ts`
- [x] T018 Seed preset categories (工作/个人/健康) and default owner_preferences in migration or `backend/src/db/seed.ts`
- [x] T019 [P] Create typed API client with credentials include in `frontend/src/lib/api.ts`
- [x] T020 [P] Scaffold React Router, TanStack Query provider, and route stubs in `frontend/src/App.tsx`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - 所有者安全登录与访问 (Priority: P1) 🎯 MVP

**Goal**: 访问令牌交换 HttpOnly 会话；未认证零数据暴露；多设备可用同一令牌

**Independent Test**: 未认证访问被拒；正确 token 进入主界面；错误 token 401；登出后会话失效（见 spec P1）

### Implementation for User Story 1

- [x] T021 [US1] Implement auth routes (`POST /api/auth/login`, `logout`, `GET /api/auth/me`) with rate limit in `backend/src/routes/auth.ts`
- [x] T022 [US1] Register auth routes and `GET /api/health`; mount auth guard on all other `/api/*` in `backend/src/index.ts`
- [x] T023 [US1] Implement LoginPage with access token input and error states in `frontend/src/pages/LoginPage.tsx`
- [x] T024 [US1] Implement useAuth hook (login, logout, session check) in `frontend/src/hooks/useAuth.ts`
- [x] T025 [US1] Add protected route wrapper redirecting unauthenticated users to LoginPage in `frontend/src/App.tsx`
- [x] T026 [US1] Implement minimal HomePage with AppShell placeholder (empty main + chat areas) in `frontend/src/pages/HomePage.tsx` and `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US1 可独立验收——仅鉴权与空壳 UI，无日程数据泄露

---

## Phase 4: User Story 2 - 自然语言添加日程 (Priority: P2)

**Goal**: 聊天栏一句话创建结构化 Schedule Card，主区域可见

**Independent Test**: 输入「下周一上午十点体检」→ 卡片创建且字段正确（见 spec P2）

### Implementation for User Story 2

- [x] T027 [US2] Implement category service (list, find-or-create CI-unique) in `backend/src/services/category.service.ts`
- [x] T028 [US2] Implement schedule service create with duration/deadline validation in `backend/src/services/schedule.service.ts`
- [x] T029 [US2] Implement cards routes (`GET /api/cards`, `POST /api/cards`) per `contracts/openapi.yaml` in `backend/src/routes/cards.ts`
- [x] T030 [US2] Implement categories routes (`GET`, `POST /api/categories`) in `backend/src/routes/categories.ts`
- [x] T031 [US2] Implement `create_card` and `add_category` tool handlers in `backend/src/services/llm/tools/create-card.ts`
- [x] T032 [US2] Implement chat session/message persistence and LLM orchestration loop in `backend/src/services/chat.service.ts`
- [x] T033 [US2] Implement chat routes (`POST /api/chat/sessions`, `POST .../messages`) in `backend/src/routes/chat.ts`
- [x] T034 [US2] Implement ChatPanel (message list, input, send, loading/error) in `frontend/src/components/ChatPanel/ChatPanel.tsx`
- [x] T035 [US2] Wire ChatPanel into AppShell sidebar in `frontend/src/layouts/AppShell.tsx`
- [x] T036 [US2] Implement minimal CardList in main area reflecting new cards in `frontend/src/components/ScheduleViews/CardList.tsx`

**Checkpoint**: US2 可独立验收——对话添加 + 主区域列表展示

---

## Phase 5: User Story 3 - 自然语言查询与问答 (Priority: P3)

**Goal**: 基于 DB 真实数据回答日程问题，零编造

**Independent Test**: 「这周三有什么安排？」与「deadline 快到了？」答复与数据一致（见 spec P3）

### Implementation for User Story 3

- [x] T037 [US3] Add `cardsOnDate`, `cardsInRange`, `cardsDueSoon` queries in `backend/src/services/schedule.service.ts`
- [x] T038 [US3] Implement `query_cards` tool handler (on_date, in_range, due_soon, search modes) in `backend/src/services/llm/tools/query-cards.ts`
- [x] T039 [US3] Extend chat system prompt to require query tools and forbid fabricated data in `backend/src/services/chat.service.ts`
- [x] T040 [US3] Handle off-topic user messages with polite redirect in `backend/src/services/chat.service.ts`
- [x] T041 [US3] Wire `due_soon_days` from owner_preferences into query_cards due_soon mode in `backend/src/services/llm/tools/query-cards.ts`

**Checkpoint**: US3 可独立验收——只读查询路径完整

---

## Phase 6: User Story 4 - 自然语言修改与删除日程 (Priority: P4)

**Goal**: 对话修改/删除；删除二次确认；歧义候选项

**Independent Test**: 「把周会改到下午四点」更新；「取消牙医预约」→ 确认 → 删除（见 spec P4）

### Implementation for User Story 4

- [x] T042 [US4] Implement `search_cards` tool handler in `backend/src/services/llm/tools/search-cards.ts`
- [x] T043 [US4] Implement `update_card` tool handler in `backend/src/services/llm/tools/update-card.ts`
- [x] T044 [US4] Implement `request_delete_card`, `confirm_delete_card`, `cancel_pending_action` in `backend/src/services/llm/tools/delete-card.ts`
- [x] T045 [US4] Implement pending_action state machine (delete_confirm, disambiguate) in `backend/src/services/chat.service.ts`
- [x] T046 [US4] Add `PATCH /api/cards/:id` and `DELETE /api/cards/:id` routes in `backend/src/routes/cards.ts`
- [x] T047 [US4] Refresh main area CardList when chat returns affectedCards in `frontend/src/components/ChatPanel/ChatPanel.tsx`

**Checkpoint**: US4 可独立验收——CRUD 闭环完成

---

## Phase 7: User Story 5 - 多视图浏览日程 (Priority: P5)

**Goal**: 日/周/月/全部视图；全部视图筛选与排序

**Independent Test**: 切换四种视图；全部视图按重要度筛选、按优先级排序（见 spec P5）

### Implementation for User Story 5

- [x] T048 [P] [US5] Implement DayView with date navigation in `frontend/src/components/ScheduleViews/DayView.tsx`
- [x] T049 [P] [US5] Implement WeekView in `frontend/src/components/ScheduleViews/WeekView.tsx`
- [x] T050 [P] [US5] Implement MonthView in `frontend/src/components/ScheduleViews/MonthView.tsx`
- [x] T051 [US5] Implement AllView with category/importance/urgency/timeNature filters and time/priority sort in `frontend/src/components/ScheduleViews/AllView.tsx`
- [x] T052 [US5] Add view switcher and date controls to TopBar in `frontend/src/components/TopBar/TopBar.tsx`
- [x] T053 [US5] Extend `GET /api/cards` with view, date, filter, sort query params in `backend/src/routes/cards.ts`
- [x] T054 [US5] Replace CardList with view router in AppShell main area in `frontend/src/layouts/AppShell.tsx`

**Checkpoint**: US5 可独立验收——多视图与筛选完整

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 多设备 sync、偏好设置、主题、生产部署、provider 扩展

- [x] T055 [P] Implement preferences routes (`GET/PATCH /api/preferences`) in `backend/src/routes/preferences.ts`
- [x] T056 [P] Implement sync route (`GET /api/sync?since=`) in `backend/src/routes/sync.ts` and `backend/src/services/sync.service.ts`
- [x] T057 Implement useVisibilitySync hook (visibilitychange → sync) in `frontend/src/hooks/useVisibilitySync.ts`
- [x] T058 Implement useTheme hook and TopBar theme toggle persisting to preferences in `frontend/src/hooks/useTheme.ts`
- [x] T059 Configure production static serve of `frontend/dist` from Fastify in `backend/src/index.ts`
- [x] T060 Implement token rotation CLI in `backend/src/cli/rotate-token.ts`
- [x] T061 [P] Implement Anthropic LLM adapter in `backend/src/services/llm/anthropic.ts`
- [x] T062 Add responsive mobile layout (collapsible chat panel) in `frontend/src/layouts/AppShell.tsx`
- [x] T063 Run all scenarios in `specs/001-conversational-scheduling/quickstart.md` and document fixes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖 Setup — **阻塞所有用户故事**
- **US1 (Phase 3)**: 依赖 Foundational — **MVP 最小交付**
- **US2 (Phase 4)**: 依赖 Foundational + US1（需已认证会话）
- **US3 (Phase 5)**: 依赖 US2（schedule service + chat 基础设施）
- **US4 (Phase 6)**: 依赖 US2（已有卡片与 chat）；与 US3 可并行
- **US5 (Phase 7)**: 依赖 US2（需卡片数据）；与 US3/US4 可并行
- **Polish (Phase 8)**: 依赖 US1–US5 核心功能

### User Story Dependencies

| Story | 依赖 | 说明 |
|-------|------|------|
| US1 (P1) | Foundational | 可最先交付 MVP |
| US2 (P2) | US1 | 聊天与卡片写操作需会话 |
| US3 (P3) | US2 | 复用 chat + schedule query |
| US4 (P4) | US2 | 复用 chat + 已有卡片 |
| US5 (P5) | US2 | 需卡片数据展示；不依赖 US3/US4 |

### Within Each User Story

- Services before routes
- Backend tools before chat route extensions
- Backend API before frontend integration

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T006, T007 可并行
- **Phase 2**: T013–T016, T019–T020 可与 T008–T012 串行批次内并行
- **Phase 7**: T048, T049, T050 三个视图可并行
- **Phase 8**: T055, T056, T061 可并行
- **跨故事**: Foundational 完成后 US1 先行；US2 完成后 **US3 ∥ US4 ∥ US5** 可分给不同开发者

---

## Parallel Example: User Story 5

```bash
# 三个视图组件可同时进行：
T048 DayView   → frontend/src/components/ScheduleViews/DayView.tsx
T049 WeekView  → frontend/src/components/ScheduleViews/WeekView.tsx
T050 MonthView → frontend/src/components/ScheduleViews/MonthView.tsx
# 完成后串行：T051 AllView → T052 TopBar → T053 API → T054 集成
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart §4.1 认证场景
5. 部署 demo 验证公网鉴权

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1 → 鉴权 MVP ✅
3. US2 → 对话添加 ✅（核心价值）
4. US3 → 对话查询 ✅
5. US4 → 修改删除 ✅
6. US5 → 多视图 ✅
7. Polish → sync、主题、生产部署

### Suggested MVP Scope

**最小可演示 MVP = Phase 1 + Phase 2 + Phase 3（US1）**

完整产品价值 MVP = 至 **Phase 4（US2）** 结束（对话添加日程）

---

## Notes

- 所有 LLM Key 仅存 `backend` 配置，禁止进入 `frontend/src/`
- 删除流程 MUST 遵循 FR-008：`request_delete_card` → 用户确认 → `confirm_delete_card`
- 标签页 sync（T057）实现 spec 澄清 Q4，在 Polish 阶段交付
- 任务 ID T001–T063 共 **63** 项；每项描述含明确文件路径
