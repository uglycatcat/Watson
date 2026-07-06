# Implementation Plan: 日程搜索、编辑增强与视觉重排

**Branch**: `003-schedule-search-edit-visual` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-schedule-search-edit-visual/spec.md`  
**User constraints**（来自 setup.md）: 在现有技术栈上迭代——Fastify + SQLite/Drizzle 后端，React 19 + Vite + Tailwind + TanStack Query 前端，单端口部署。

## Summary

第三轮在 001/002 之上补齐 **全局标题搜索**、**详情编辑**、**仅标题必填 / 无时间卡片**、**全部视图多维筛选排序**、**AI 与日程解耦**，并重排 **日/全部网格**、**周/月全屏**、**深色 NVIDIA 绿强调色**；后端新增 **标题唯一性（title_lower）**、**可空 timeNature**、**扩展 query 参数** 与 **chat 纯文本化**。

技术路径：**前后端协同**——搜索/变暗/编辑态/视觉以 `frontend/src` 为主；`schedule.service`、schema migration、`chat.service` 去工具编排触及后端。全局搜索优先 **客户端** 对已有 `GET /api/cards?view=all` 缓存过滤（单用户卡片量小），不新增全文检索服务。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x（与 001/002 相同）

**Primary Dependencies**:
- Backend: Fastify, Drizzle ORM, SQLite, 既有 OpenAI-compatible LLM adapter
- Frontend: React 19, Vite, Tailwind 4, TanStack Query, date-fns / date-fns-tz（002 已引入）

**Storage**:
- 服务端：SQLite `schedule_cards` 增 `title_lower` + unique index；`time_nature` 改为 nullable（支持无时间）
- 客户端：无新持久键；搜索为会话内 UI state

**Testing**: Vitest + RTL（前端）；node:test 扩展 schedule.service 用例（无时间、重名、新 sort/filter）

**Target Platform**: 浏览器（桌面 + 移动响应式）；单实例公网部署

**Project Type**: Web application monorepo（`backend/` + `frontend/`）

**Performance Goals**:
- 搜索候选更新 < 100ms（客户端过滤 + debounce 可选，满足 SC-002）
- 编辑保存后 5s 内视图刷新（TanStack invalidate，SC-006）
- 网格/全屏布局 60fps 滚动（CSS grid/flex，无重布局 JS）

**Constraints**:
- 不新增 `DEEPSEEK_API_KEY`；DeepSeek 走 `LLM_PROVIDER=deepseek` + 既有 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`
- 主题色仅改 CSS 变量（`index.css` `--accent`），不散落硬编码
- 重名 migration 须处理既有重复标题（见 research R-003）
- AI 解耦：零 `affectedCards` 副作用，不要求强制话术（spec 澄清 B）

**Scale/Scope**: 单用户；卡片量级数百；改动约 25–35 文件（前后端）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (Watson v1.0.0)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth design | 新/改 API 均在 session 保护下；搜索/编辑/筛选不泄露数据 | ✅ | ✅ |
| II. 密钥外置 | Secrets handling | 无新硬编码密钥；LLM 仍经 env 注入 | ✅ | ✅ |
| III. AI 可插拔 | LLM abstraction | 去工具编排不绑定模型；DeepSeek 仍经 openai-compatible adapter | ✅ | ✅ |
| IV. 日程卡片核心 | Data model | 扩展无时间合法态 + 标题唯一；不新增卡片类型 | ✅ | ✅ data-model |
| V. 多设备一致 | Client strategy | CRUD/筛选经同一 API；搜索客户端过滤与全量列表一致 | ✅ | ✅ |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation (this feature)

```text
specs/003-schedule-search-edit-visual/
├── plan.md              # 本文件
├── research.md          # Phase 0 — 技术决策
├── data-model.md        # Phase 1 — schema/UI 状态扩展
├── quickstart.md        # Phase 1 — 验收指南
├── contracts/
│   ├── api-usage.md     # REST 变更与 query 扩展
│   └── ui-components.md # 搜索/编辑/网格组件契约
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code（本特性改动范围）

```text
watson/
├── backend/
│   ├── drizzle/
│   │   └── 0001_title_unique_untimed.sql   # 【新建】title_lower + nullable time_nature
│   ├── src/
│   │   ├── db/schema.ts                    # title_lower, timeNature nullable
│   │   ├── types.ts                        # TimeNature | null, DTO 扩展
│   │   ├── services/
│   │   │   ├── schedule.service.ts         # 无时间 CRUD、重名、filter/sort
│   │   │   └── chat.service.ts             # 纯文本，无工具循环
│   │   └── routes/cards.ts                 # 新 query params, 409 title conflict
└── frontend/src/
    ├── index.css                           # 深色 --accent → NVIDIA 绿
    ├── layouts/AppShell.tsx                # 搜索 dim overlay, h-full 主区
    ├── components/
    │   ├── TopBar/TopBar.tsx               # 全局搜索 + 下拉
    │   ├── cards/
    │   │   ├── CardDetailModal.tsx         # view ↔ edit
    │   │   ├── CreateCardModal.tsx         # Enter 提交
    │   │   └── CardFormFields.tsx          # 无时间、校验
    │   ├── ScheduleViews/
    │   │   ├── AllView.tsx                 # 多维 filter/sort + grid
    │   │   ├── DayView.tsx                 # grid
    │   │   ├── WeekView.tsx                # 七列铺满
    │   │   ├── MonthView.tsx               # 全屏网格
    │   │   └── CardGrid.tsx                # 【新建】圆角网格卡片
    │   ├── ChatPanel/ChatPanel.tsx         # 移除 affectedCards invalidate
    │   └── search/                         # 【新建】titleSearch.ts, GlobalSearch.tsx
    ├── hooks/useCardMutations.ts           # updateCard
    └── lib/api.ts                          # updateCard, 扩展 CardQueryParams
```

**Structure Decision**: 延续 001 monorepo；本特性 **backend + frontend** 均有变更。OpenAPI 增量说明见 `contracts/api-usage.md`（不强制复制完整 openapi.yaml，plan 后 tasks 可 PATCH 001 yaml）。

## Implementation Phases

### Phase A — 后端基础（无时间 + 重名 + 筛选）【Backend】

1. **Migration `0001_title_unique_untimed.sql`**
   - 添加 `title_lower TEXT NOT NULL`（回填 `lower(trim(title))`）
   - **重名预处理**：迁移前 SQL 对重复 `title_lower` 行按 `created_at` 保留最早，其余 rename 为 `"{title} (2)"` 等（见 research R-003）
   - `CREATE UNIQUE INDEX idx_cards_title_lower ON schedule_cards(title_lower)`
   - `time_nature` 改为 nullable（SQLite: 重建列或新表 copy——Drizzle kit 生成）

2. **`schedule.service.ts`**
   - `normalizeTitle(title)` → `{ title, titleLower }`
   - `assertTitleUnique(titleLower, excludeId?)` → 409
   - `create` / `update`：仅 title 必填；无 timeNature + 全时间 null → untimed；有 timeNature 则填齐时间
   - `listAll`：`hasTime=true|false` filter；`sort=title|createdAt`；untimed 在 time sort 置后
   - `cardInRange`：untimed → false（日/周/月排除）

3. **`routes/cards.ts`**：解析 `hasTime`, 扩展 `sort` enum；409 → `{ error: "Title already exists" }`

### Phase B — AI 解耦 【Backend + Frontend】

1. **`chat.service.ts`**：移除 `LLM_TOOLS` while 循环；单次 `provider.chat(messages)`；`affectedCards: []`，`pendingConfirmation: null` 恒空（保留字段兼容前端旧版）
2. **`definitions.ts`**：`SYSTEM_PROMPT` 改为通用助手（不提及工具）
3. **`ChatPanel.tsx`**：删除 `affectedCards` → `invalidateQueries`；更新 placeholder

### Phase C — 表单 / 编辑 / API 客户端 【Frontend + 既有 PATCH】

1. **`api.ts`**：`updateCard(id, patch)`；`ScheduleCardInput.timeNature` optional；`getCards` params 扩展
2. **`CardFormFields` + `validateCardForm`**：无时间路径；部分时间拒绝；重名错误展示
3. **`CreateCardModal`**：Enter + composition 防护；默认不预填时间
4. **`CardDetailModal`**：view/edit 两态；`useCardMutations.updateCard`
5. **`useCardMutations`**：`updateCard` mutation + invalidate

### Phase D — 全局搜索 【Frontend】

1. **`search/titleSearch.ts`**：子串 + 分散字符匹配；相关度评分；top 8；字母序 tie-break
2. **`TopBar` + `GlobalSearch`**：focus 时 AppShell main overlay；Escape 关闭
3. 数据源：`useQuery(["cards", { view: "all" }])` 或 AppShell 已有 cards 缓存
4. 点击候选 → `setSelectedCard`

### Phase E — 全部视图筛选排序 【Frontend + Backend query】

1. **`AllView`**：UI 控件 category / importance / urgency / timeNature / hasTime；sort 下拉扩展
2. 组合筛选 AND（spec FR-013）；空结果空状态

### Phase F — 视觉重排 + 主题 【Frontend】

1. **`CardGrid.tsx`**：圆角矩形 + `grid grid-cols-* gap-*`；DayView + AllView 采用
2. **`WeekView`**：`flex flex-1 h-full min-h-0` 七列圆角容器
3. **`MonthView`**：`flex-1 h-full` 网格行 `grid-rows-6` 均分高度
4. **`index.css`**：`.dark { --accent: #76b900; }`（NVIDIA 绿）；`:root` 保持 `#2563eb`
5. 审计硬编码 blue accent class，改 `text-[var(--accent)]` / `bg-[var(--accent)]`

## Frontend / Backend Change Matrix

| 能力 | 层级 | 改动 |
|------|------|------|
| 全局搜索 + 变暗 | **纯前端** | TopBar, AppShell, search/titleSearch.ts |
| Enter 快捷创建 | **纯前端** | CreateCardModal, CardFormFields |
| 详情编辑 | 前端 + **既有 PATCH** | CardDetailModal, updateCard |
| 无时间卡片 | **后端 + 前端** | schema nullable timeNature, schedule.service, 表单校验 |
| 全部视图筛选排序 | **后端 + 前端** | listAll hasTime/sort, AllView UI |
| 标题唯一 | **后端 + 前端** | migration title_lower, 409 处理 |
| AI 解耦 | **后端 + 前端** | chat.service, ChatPanel |
| 日/全部网格 | **纯前端** | CardGrid, DayView, AllView |
| 周/月全屏 | **纯前端** | WeekView, MonthView, AppShell layout |
| 深色 NVIDIA 绿 | **纯前端** | index.css CSS 变量 |
| DeepSeek 配置 | **无代码变更** | 沿用 LLM_PROVIDER=deepseek + 既有 env |

## Complexity Tracking

> 无宪法违规。AI 从「对话操作日程」收敛为「纯聊天」是 spec 明确的产品决策，不违反原则 III（provider 仍可插拔）。

| 决策 | 说明 |
|------|------|
| 搜索客户端过滤 | 单用户卡片量小，避免新 API；cards 已在 TanStack cache |
| title_lower 双列 | 与 categories 模式一致，便于 CI 唯一与索引 |
| migration 自动 rename 重名 | 避免 migration 失败；保留最早一条原标题 |
| chat 保留 affectedCards 字段 | 前端兼容；恒空数组 |
| 主题仅 CSS 变量 | 收敛点单一，浅色不变 |

## Phase 0 / Phase 1 Artifacts

| 文件 | 状态 |
|------|------|
| [research.md](./research.md) | ✅ |
| [data-model.md](./data-model.md) | ✅ |
| [quickstart.md](./quickstart.md) | ✅ |
| [contracts/api-usage.md](./contracts/api-usage.md) | ✅ |
| [contracts/ui-components.md](./contracts/ui-components.md) | ✅ |

**Next**: `/speckit-tasks` 生成可执行任务列表。
