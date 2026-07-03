# Research: 对话式日程管理

**Feature**: `001-conversational-scheduling`  
**Date**: 2026-07-03

## R-001: 数据持久化选型

**Decision**: **SQLite**（通过 `better-sqlite3` + **Drizzle ORM** 访问）

**Rationale**:
- 单用户、单实例、数据量小（数千张卡片量级），SQLite 零运维、单文件备份/simple copy 即可迁移。
- 无需独立数据库进程，适合轻量公网 VPS 部署。
- Drizzle 提供类型安全 schema、迁移脚本，避免 raw SQL 维护成本。
- WAL 模式支持并发读；写并发在单用户场景足够。

**Alternatives considered**:

| 方案 | 优点 | 拒绝原因 |
|------|------|----------|
| PostgreSQL | 功能完整、扩展性强 | 单用户场景 overkill；需额外服务与运维 |
| JSON 文件 | 极简 | 无事务、并发写风险、查询/筛选需全量加载 |
| LowDB / 纯文件 | 零依赖 | 缺乏 schema 约束与索引，随数据增长性能差 |
| Turso (libSQL) | 边缘同步 | 单实例部署无必要；增加外部依赖 |

**Operational notes**:
- 数据文件默认 `data/watson.db`（`.gitignore` 覆盖）。
- 启动时自动运行 pending migrations。
- 备份策略：定期复制 `watson.db` + `config.yaml`（不含 LLM Key 亦可）。

---

## R-002: 后端框架

**Decision**: **Fastify 5** + TypeScript

**Rationale**:
- 轻量、高性能，内置 schema 校验（JSON Schema / Zod 集成）。
- 插件生态满足 session、CORS、rate-limit、static 需求。
- 比 Express 更现代的 async 错误处理。

**Alternatives considered**:
- **Express**：生态最大但中间件风格较旧；性能略逊。
- **Hono**：更轻，但团队熟悉度与静态资源集成不如 Fastify 成熟。
- **NestJS**：结构完整但对单用户 MVP 过重。

---

## R-003: 前端框架与 UI

**Decision**: **React 19** + **Vite 6** + **TypeScript** + **Tailwind CSS 4** + **shadcn/ui**

**Rationale**:
- React 组件化适合 Cursor 式「主区 + 侧边栏」布局。
- shadcn/ui 提供高质量暗色/亮色主题切换（CSS 变量），贴近 Cursor 视觉。
- Vite 开发体验好，HMR 快。

**Alternatives considered**:
- **Vue 3**：同样可行，但 Cursor 对标场景 React 生态组件更丰富。
- **SvelteKit**：更轻，但日历/聊天复合 UI 生态略少。
- **纯 SSR (Next.js)**：单页应用已足够；SSR 增加复杂度且无 SEO 需求。

**Calendar views**: 自研轻量视图组件 + `date-fns`（日/周/月/全部）；避免引入过重 FullCalendar 依赖，全部视图用虚拟列表 + 筛选栏。

---

## R-004: 单用户鉴权（对齐 spec 澄清 Q1）

**Decision**: **部署时生成 Bearer Token → 一次性交换为 HttpOnly Session Cookie**

> **与 plan 输入的差异**：用户输入示例提到「强密码 + 会话」；spec 澄清已确定为**单一访问令牌**。本方案遵循 spec（`FR-001`），安全目标等价：无令牌/无会话则零数据暴露。

**流程**:
1. 首次部署：`npm run watson:init` 生成 `WATSON_ACCESS_TOKEN`（256-bit 随机，写入 `.env`）。
2. 服务端仅存 **token 的 bcrypt hash**（`WATSON_ACCESS_TOKEN_HASH`），明文 token 只在 init 时输出一次。
3. 前端登录页：用户粘贴 token → `POST /api/auth/login` → 校验 hash → 签发 **HttpOnly + Secure + SameSite=Strict** session cookie（`@fastify/secure-session` 或 signed JWT，TTL 可配置，默认 30 天）。
4. 所有 `/api/*`（除 login/health）经 session 中间件保护。
5. 登出：`POST /api/auth/logout` 清除 cookie。
6. **Rate limit**：login 端点 5 次/分钟/IP，防暴力尝试。
7. **令牌轮换**：`npm run watson:rotate-token` 生成新 token 并更新 hash；旧 token 立即失效。

**Alternatives considered**:
- **每请求 Bearer Header**：移动端/API 友好，但浏览器 SPA 易泄露（localStorage）；改 HttpOnly cookie 更安全。
- **用户名 + 密码**：spec 明确 v1 不使用。
- **2FA**：单用户 MVP 过度；后续 MINOR 版本可加。

---

## R-005: LLM 可插拔架构

**Decision**: **Provider 接口 + OpenAI-compatible 默认驱动 + Anthropic 适配器**

**接口**:
```typescript
interface LLMProvider {
  chat(messages: Message[], tools?: ToolDefinition[]): AsyncIterable<StreamChunk>;
  name: string;
}
```

**Provider 映射**:
| Config `PROVIDER` | 实现 | 说明 |
|-------------------|------|------|
| `openai` | OpenAI SDK / fetch | 默认；也用于 DeepSeek 等（改 BASE_URL） |
| `deepseek` | 同上 | `BASE_URL=https://api.deepseek.com/v1` |
| `custom` | OpenAI-compatible fetch | 任意兼容端点 |
| `anthropic` | Anthropic SDK 适配器 | Claude；内部转为统一 Message 格式 |

**配置加载**（优先级：环境变量 > `config.yaml`）:
```yaml
llm:
  provider: openai
  api_key: ${LLM_API_KEY}      # 实际从 .env 读取
  base_url: https://api.openai.com/v1
  model: gpt-4o-mini
```

**AI 编排模式**: **Tool-calling（函数调用）**，非纯 prompt 解析：
- 后端定义 tools：`create_card`, `update_card`, `delete_card`（pending confirm）, `confirm_delete`, `query_cards`, `list_categories`, `add_category`。
- LLM 返回 tool call → 后端执行 → 结果回传 LLM 生成用户可读回复。
- **删除二次确认**：`delete_card` 仅创建 `pending_delete` 状态；用户肯定后调用 `confirm_delete`。
- **查询防编造**：`query_cards` 只返回 DB 结果；LLM 禁止臆造 tool 未返回的数据（system prompt 约束 + 后端校验）。

**Alternatives considered**:
- **纯 prompt + JSON 解析**： fragile，易 hallucinate 结构。
- **LangChain**：抽象过重，vendor lock-in 到框架。
- **前端直连 LLM**：Key 暴露风险；违反密钥外置到服务端的最佳实践（浏览器不应持有 LLM Key）。

> LLM Key 存服务端 `config.yaml`/`.env`，不进入前端 bundle。前端只调 Watson 后端 `/api/chat`。

---

## R-006: 多设备同步（对齐 spec 澄清 Q4）

**Decision**: **`document.visibilitychange` + `focus` 事件触发增量拉取**

**实现**:
- 前端 hook `useVisibilitySync`：标签页变为 `visible` 时调用 `GET /api/sync?since={lastUpdatedAt}`。
- 后端返回 `updatedAt > since` 的 cards + preferences 变更。
- 合并到本地 React Query cache；目标 5 秒内完成（SC-006）。
- 不做 WebSocket/SSE：单用户、标签页激活策略下 polling-on-focus 足够轻量。

**Alternatives considered**:
- **WebSocket 推送**：实时性最好，但增加连接管理与部署复杂度。
- **定时轮询**：浪费资源，与 spec「后台不持续轮询」冲突。

---

## R-007: Monorepo 与部署

**Decision**: **npm workspaces**（`backend` + `frontend`），生产环境 **Fastify 托管前端静态资源**

**Rationale**:
- 单端口部署（如 `:3000`），简化公网反向代理（Nginx/Caddy TLS termination）。
- CORS 问题最小化。

**部署拓扑**:
```
Internet → Caddy/Nginx (TLS) → Node Fastify :3000
                                  ├── /api/*  → API routes
                                  └── /*      → Vite build static
```

**Alternatives considered**:
- **前后端分离部署**：两个域名/端口，CORS +  cookie SameSite 配置更复杂。
- **Docker Compose**：可选文档，非 v1 必需。

---

## R-008: 聊天上下文与 pending 状态

**Decision**: **SQLite 存储 chat_messages + chat_sessions；pending_delete 存 session 状态**

- 每个 session 关联 `pending_action` JSON（如 `{ type: 'delete', cardId, askedAt }`）。
- 会话上下文最近 N 轮（默认 20）送入 LLM，控制 token 成本。
- v1 不做长期 chat 全文检索。

---

## R-009: 测试策略

**Decision**:
- **Backend**: Node.js built-in `node:test` + `supertest`（HTTP 集成）；contract 测试对照 `contracts/openapi.yaml`。
- **Frontend**: Vitest + React Testing Library（关键 hooks/组件）。
- **E2E**（可选 Phase 2）：Playwright 覆盖 login → chat add → view 流程。

---

## R-010: 配置管理

**Decision**: **`config.yaml` + `.env` 叠加**（`dotenv` + 轻量 YAML loader）

- `config.example.yaml` / `.env.example` 脱敏入库。
- 敏感项：`WATSON_ACCESS_TOKEN`（init 后仅存 hash）、`LLM_API_KEY`。
- 运行时配置校验（Zod schema），启动失败 fast-fail。

---

## 未决项（plan 阶段已关闭）

| 原 unknown | 决议 |
|------------|------|
| 数据库选型 | SQLite + Drizzle |
| 鉴权细节 | Bearer token → HttpOnly session |
| LLM 集成模式 | 后端 tool-calling |
| 多设备同步 | visibilitychange 拉取 |
| 项目结构 | npm workspaces monorepo |
