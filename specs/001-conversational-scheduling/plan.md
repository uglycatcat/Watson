# Implementation Plan: 对话式日程管理

**Branch**: `001-conversational-scheduling` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-conversational-scheduling/spec.md`  
**User constraints**: Node.js 全栈、Web 前后端、Cursor 式 UI、LLM 可插拔、单用户坚固鉴权、轻量持久化

## Summary

Watson v1 采用 **npm workspaces monorepo**：**Fastify + SQLite (Drizzle)** 后端，**React + Vite + Tailwind + shadcn/ui** 前端。单端口部署，Fastify 托管 API 与静态资源。

核心能力通过 **后端 LLM tool-calling 编排** 实现对话式日程 CRUD；数据以 **Schedule Card** 为中心存 SQLite。鉴权遵循 spec 澄清：**部署时 Bearer Token → HttpOnly Session Cookie**（非用户名密码）。多设备通过 **标签页 visibility 事件增量 sync** 保持一致。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x  
**Primary Dependencies**:
- Backend: Fastify 5, Drizzle ORM, better-sqlite3, @fastify/secure-session, @fastify/rate-limit, bcrypt, Zod, openai SDK, @anthropic-ai/sdk
- Frontend: React 19, Vite 6, TanStack Query, date-fns, Tailwind 4, shadcn/ui, lucide-react

**Storage**: SQLite (`data/watson.db`)，WAL 模式，Drizzle migrations  
**Testing**: node:test + supertest (backend), Vitest + RTL (frontend)  
**Target Platform**: Linux/macOS 服务器或本地；浏览器（Chrome/Safari/Firefox 最近两版）  
**Project Type**: Web application (backend + frontend monorepo)  
**Performance Goals**:
- API p95 < 200ms（不含 LLM 调用）
- 首屏加载 < 2s（生产 gzip）
- 标签页 sync 完成 < 1s（单用户全量 < 500 卡片）

**Constraints**:
- 单用户、单实例；密钥外置；LLM Key 仅存服务端
- 公网 HTTPS（生产 MUST Secure cookie）
- 无原生 App、无 WebSocket（v1）

**Scale/Scope**: 1 用户，≤10k 卡片，≤1k chat messages；单 VPS 512MB RAM 可运行

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (Watson v1.0.0)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth design | 所有端点与页面均在鉴权保护下；未授权访问无数据泄露路径 | ✅ Bearer→Session, rate limit | ✅ openapi 全路由 security |
| II. 密钥外置 | Secrets handling | 无硬编码密钥；config/env 注入；示例配置脱敏 | ✅ config.example | ✅ quickstart 文档化 |
| III. AI 可插拔 | LLM abstraction | Provider 可切换；OpenAI 兼容路径；业务不绑定单一模型 | ✅ LLMProvider 接口 | ✅ llm-tools.md + adapters |
| IV. 日程卡片核心 | Data model | Schedule Card 含时间性质、重要度、紧急度 | ✅ SQLite schema | ✅ data-model.md |
| V. 多设备一致 | Client strategy | 响应式浏览器；同 API；标签页 sync | ✅ visibility sync | ✅ /api/sync + hook |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation (this feature)

```text
specs/001-conversational-scheduling/
├── plan.md              # 本文件
├── research.md          # Phase 0 — 技术决策
├── data-model.md        # Phase 1 — 数据模型
├── quickstart.md        # Phase 1 — 验收指南
├── contracts/
│   ├── openapi.yaml     # REST API
│   └── llm-tools.md     # LLM function contracts
└── tasks.md             # Phase 2 (/speckit-tasks，尚未生成)
```

### Source Code (repository root)

```text
watson/
├── package.json                 # npm workspaces root
├── config.example.yaml
├── .env.example
├── data/                        # gitignored: watson.db
├── backend/
│   ├── package.json
│   ├── drizzle.config.ts
│   ├── drizzle/                 # SQL migrations
│   └── src/
│       ├── index.ts             # Fastify entry, static serve
│       ├── config/              # load yaml + env, Zod validate
│       ├── db/
│       │   ├── schema.ts
│       │   └── migrate.ts
│       ├── middleware/
│       │   ├── auth.ts          # session guard
│       │   └── error-handler.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── cards.ts
│       │   ├── categories.ts
│       │   ├── chat.ts
│       │   ├── preferences.ts
│       │   └── sync.ts
│       ├── services/
│       │   ├── schedule.service.ts
│       │   ├── category.service.ts
│       │   ├── chat.service.ts  # LLM orchestration loop
│       │   ├── sync.service.ts
│       │   └── llm/
│       │       ├── provider.ts  # interface
│       │       ├── openai-compatible.ts
│       │       ├── anthropic.ts
│       │       └── tools/       # tool handlers
│       └── cli/
│           ├── init.ts          # watson:init token gen
│           └── rotate-token.ts
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── layouts/
│       │   └── AppShell.tsx     # TopBar + Main + ChatPanel
│       ├── components/
│       │   ├── TopBar/
│       │   ├── ScheduleViews/   # Day, Week, Month, All
│       │   ├── ChatPanel/
│       │   └── ui/              # shadcn
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useVisibilitySync.ts
│       │   └── useTheme.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   └── HomePage.tsx
│       └── lib/api.ts           # typed fetch client
└── tests/
    └── (per workspace)
```

**Structure Decision**: 选用 **Option 2 Web application**（`backend/` + `frontend/`），根目录 npm workspaces 统一脚本。生产由 backend 托管 frontend `dist/`，避免双端口与 CORS 复杂度。

## Key Technical Decisions & Tradeoffs

| # | 决策 | 取舍说明 |
|---|------|----------|
| D1 | **SQLite** 而非 PostgreSQL | ✅ 零运维、单文件备份、单用户足够；❌ 不适合未来多实例水平扩展（v1 明确单实例） |
| D2 | **Bearer Token → HttpOnly Session** 而非每请求 Bearer | ✅ 浏览器更安全、符合 spec Q1；❌ 与用户输入示例「密码登录」不同（spec 优先） |
| D3 | **后端 LLM tool-calling** 而非前端直连 LLM | ✅ Key 不暴露、查询可强制走 DB；❌ 后端复杂度高 |
| D4 | **visibility sync** 而非 WebSocket | ✅ 轻量、符合 spec Q4；❌ 非实时（需切回标签页） |
| D5 | **Fastify 单端口托管** 而非前后端分离部署 | ✅ 部署简单；❌ 前后端耦合发布 |
| D6 | **删除二次确认状态机**（pending_action） | ✅ 满足 FR-008；❌ chat 状态管理略复杂 |
| D7 | **OpenAI-compatible 为默认 provider** | ✅ DeepSeek/自建中转即改 BASE_URL；Anthropic 单独 adapter |

## Complexity Tracking

> 无宪法违规需 justification。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 Output

✅ [research.md](./research.md) — 全部 NEEDS CLARIFICATION 已关闭

## Phase 1 Output

✅ [data-model.md](./data-model.md)  
✅ [contracts/openapi.yaml](./contracts/openapi.yaml)  
✅ [contracts/llm-tools.md](./contracts/llm-tools.md)  
✅ [quickstart.md](./quickstart.md)

## Implementation Phases (for /speckit-tasks)

建议任务拆分顺序：

1. **Foundation**: monorepo scaffold, config, SQLite+Drizzle, auth, health
2. **US1 (P1)**: Login page + session middleware + protected routes
3. **US2–4 (P2–P4)**: Schedule CRUD services + LLM tools + chat panel
4. **US5 (P5)**: Schedule views + filters/sort
5. **Cross-cutting**: visibility sync, theme, preferences, quickstart validation

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM 时间解析错误 | tool 参数 Zod 校验 + 助手确认具体日期 |
| LLM 编造查询结果 | 强制 query_cards tool；system prompt 约束 |
| Token 泄露 | 仅 init 输出一次；存 bcrypt hash；HTTPS + Secure cookie |
| SQLite 写锁 | WAL + 单用户写频率低，足够 |
| Anthropic tool API 差异 | adapter 层隔离；MVP 先跑 OpenAI-compatible |

## Next Step

```bash
/speckit-tasks
```

生成可执行的 `tasks.md` 后即可 `/speckit-implement`。
