# Watson

> **单用户、AI 陪伴式的个人日程管理系统。** Cursor 式布局：主区是日程视图（日/周/月/全部/四象限/回收站），右侧常驻一个 AI 聊天栏。公网部署、多设备浏览器访问，四字验证码登录。

面向**新接手的开发者**——读完这份文档你应该能：把项目跑起来、看懂目录、知道数据怎么流动、知道 AI 到底做了什么（以及**没**做什么）。产品愿景版 README 见 [`README.product.md.bak`](./README.product.md.bak)。

---

## 0. 30 秒上手

```bash
# 前置：Node v22、npm。数据库用 better-sqlite3（原生模块，见 §7 平台注意）
git clone <repo> && cd watson
npm install                     # 根目录一次装齐（npm workspaces，前后端共用 node_modules）
cp .env.example .env            # 填入 LLM_API_KEY 等，见 §4
npm run dev                     # 前后端并行热重载：后端 :3001，前端 :5173
# 打开 http://localhost:5173，输入验证码 SHER 登录
```

生产：`npm run build` 后 `npm start`——后端 `:3001` 同时托管前端静态产物（单端口部署）。

---

## 1. 技术栈

| 层 | 选型 |
|---|---|
| **前端** | React 19 + TypeScript + Vite 6 + Tailwind v4；`@tanstack/react-query`（服务端状态）、`react-router-dom` v7、`date-fns` / `date-fns-tz`（时区）、`lucide-react`（图标）、`react-markdown`（渲染 AI 回复） |
| **后端** | Node 22 + **Fastify 5** + TypeScript（ESM，`"type":"module"`）；`@fastify/cookie` / `cors` / `static` / `rate-limit` |
| **数据库** | **SQLite**（`better-sqlite3`，同步驱动）+ **Drizzle ORM** + drizzle-kit 迁移 |
| **AI** | `openai` SDK（OpenAI 兼容接口，含 DeepSeek）与 `@anthropic-ai/sdk`，可插拔 provider |
| **校验** | `zod`（配置 & 输入） |
| **构建/运行** | 根 `concurrently` 并行起前后端；后端 `tsx` 热重载 |

代码量：约 **8.4k 行** TS/TSX（不含依赖）。

---

## 2. 目录结构

```
watson/
├── package.json          # npm workspaces 根：dev / build / start / db:migrate
├── .env / .env.example   # 后端配置（不入版本库）
├── data/watson.db        # 运行时 SQLite 库（+ -wal / -shm）
│
├── backend/  (@watson/backend)
│   └── src/
│       ├── index.ts              # 进程入口：buildApp() → listen
│       ├── app.ts                # 组装 Fastify：中间件 + 会话 cookie + 路由 + 静态托管
│       ├── config/index.ts       # zod 校验的配置装载（从 .env 读，见 §4）
│       ├── db/
│       │   ├── schema.ts         # Drizzle 表定义（§3）
│       │   ├── index.ts          # getDb() / runMigrations()
│       │   ├── migrate.ts        # 独立迁移入口（npm run db:migrate）
│       │   └── seed.ts           # 预置分类等种子数据
│       ├── auth/access-code.ts   # 四字验证码校验
│       ├── middleware/           # auth 鉴权钩子 + 全局错误处理
│       ├── routes/               # HTTP 层：cards/categories/chat/daily-reports/preferences/sync/auth
│       └── services/             # 业务层：schedule / category / chat / daily-report / sync
│           └── llm/              # provider 抽象（openai-compatible / anthropic）+ tools（见 §6）
│   └── drizzle/                  # 0000→0011 迁移 SQL
│
└── frontend/ (@watson/frontend)
    └── src/
        ├── main.tsx / App.tsx        # 入口 + 路由 + Provider
        ├── pages/                    # LoginPage / HomePage
        ├── layouts/AppShell.tsx      # 顶栏 + 视图区 + 侧边聊天栏 的整体骨架
        ├── components/
        │   ├── ScheduleViews/        # Day/Week/Month/All/Quadrant/Trash 视图 + 时间导航
        │   ├── calendar/             # 纯函数：网格排布、跨天条、时区换算（可单测）
        │   ├── cards/                # 卡片：详情/创建弹窗、父卡片、优先级、阶段、完成勾选
        │   ├── ChatPanel/            # AI 聊天栏
        │   ├── daily-report/         # 每日报告（目标/结果/复盘）
        │   ├── search/               # 全局搜索
        │   ├── dnd/                  # 拖拽到回收站
        │   ├── TopBar/ + ui/         # 顶栏、通用 UI（Modal/Toast/Drawer…）
        │   └── auth/PinCodeInput.tsx
        ├── hooks/                    # useAuth / useCardMutations / useTheme / useVisibilitySync…
        └── lib/api.ts                # 唯一的后端调用封装
```

---

## 3. 数据模型（`backend/src/db/schema.ts`）

6 张表，全部时间字段存 ISO 字符串（TEXT）。

- **`schedule_cards`** — 核心。日程卡片。
  - 时间性质二选一：**持续型**（`startAt`+`endAt`）或**截止型**（`deadlineAt`）。
  - `importance` / `urgency`（整数，默认 5）→ 构成「重要 × 紧急」四象限。
  - `status`: `active` / `completed` / `deleted`（软删，`trashedAt` 记时间，走回收站）。
  - `stage`: `not_started` / `in_progress` / `wrapping_up`（进行阶段）。
  - `kind`: `standard` / `parent`；父子卡通过 `parentId` 关联（父卡片组合功能）。
  - `titleLower` 冗余小写列 → 大小写不敏感搜索。多列索引覆盖时间/分类/阶段/父子。
- **`categories`** — 分类。`nameLower` 唯一、`color` 左边缘色条、`isPreset` 预置标记。
- **`daily_reports`** — 每日报告，`date` 主键，含 `goal`/`result`/`analysis`。
- **`owner_preferences`** — 单例：`theme`、`timezone`（默认 `Asia/Shanghai`）、`dueSoonDays`。
- **`chat_sessions`** / **`chat_messages`** — AI 会话与消息（`role`/`content`/`toolCalls`/`relatedCardId`）。

迁移：`backend/drizzle/0000_initial.sql` → `0011_parent_cards.sql`，连续无断号。改 schema 后用 drizzle-kit 生成新迁移，`npm run db:migrate` 应用。

---

## 4. 配置（`.env`）

后端启动时 `config/index.ts` 用 **zod** 从项目根 `.env` 装载并校验。键（见 `.env.example`）：

| 键 | 说明 |
|---|---|
| `SESSION_SECRET` | 会话密钥。**生产必须设，≥16 字符**，否则启动报错；开发缺省用不安全占位值 |
| `SESSION_TTL_DAYS` | 会话有效期（默认 30） |
| `LLM_PROVIDER` | `openai` / `deepseek` / `anthropic` / `custom` |
| `LLM_API_KEY` | LLM 密钥（缺省则 AI 聊天不可用，其余功能正常） |
| `LLM_BASE_URL` | OpenAI 兼容端点（默认 `https://api.openai.com/v1`） |
| `LLM_MODEL` | 模型名（默认 `gpt-4o-mini`） |
| `PORT` / `HOST` | 默认 `3001` / `0.0.0.0` |
| `NODE_ENV` | `production` 时开日志、cookie `secure`、强制校验密钥 |

> 配置已**精简为单一 `.env`**（早期的 `config.yaml` / YAML 加载已移除）。密钥不入库，`.gitignore` 已排除 `.env` 和 `.cursor/`。

---

## 5. 认证与请求流

- **登录**：前端提交四字验证码 → `POST /api/auth/login` → `verifyAccessCode` 校验（默认 `SHER`，生产用 `WATSON_ACCESS_CODE` 覆盖）→ 通过则种下 **HttpOnly + SameSite=strict** 的 `watson_session` cookie。登录接口带**限流**（30 次/分钟）。
- **会话**：cookie 里是 base64url 编码的 `{authenticated, authenticatedAt}`；每个请求经 `onRequest` 钩子解码挂到 `request.session`。
- **鉴权**：`middleware/auth.ts` 全局钩子拦截，除 `/api/health`、`/api/auth/login` 等白名单外都要求已登录。
- **早期的长随机令牌 + `watson:init` 初始化流程已移除**——只保留验证码登录。

---

## 6. AI 聊天：现状（**重要，别被产品文档误导**）

产品愿景是「用一句话让 AI 增删改查日程」，但**当前实现中，AI tool-calling 被刻意禁用**：

```ts
// backend/src/services/llm/tools/definitions.ts
export const LLM_TOOLS: ToolDefinition[] = [];   // 空 —— 见 Constitution III / FR-028
```

- **AI 聊天目前是纯文本对话**：`chat.service.ts` 只用 `SYSTEM_PROMPT` 走 provider，**不调用任何工具、不读写日程数据**。`tools/handlers.ts` 也是空壳。
- provider 抽象（`services/llm/provider.ts`）已就绪，支持 OpenAI 兼容与 Anthropic 两条实现，可通过 `.env` 切换。
- 日程的增删改查目前**全部通过 UI + REST API 手动完成**（见 §8），不经过 AI。

> 如果未来要恢复 AI 操作日程：往 `LLM_TOOLS` 填工具定义、在 `handlers.ts` 实现分发、在 `chat.service.ts` 接回工具循环即可——脚手架都在，只是按项目宪法约定关掉了。**改动前请先确认是否违反 Constitution III / FR-028。**

---

## 7. 平台注意（Linux / Windows / macOS）

- 构建工具链纯 JS（tsc / vite / tsx），npm scripts 只用 `&&`，路径全走 `path.join`——**代码本身跨平台**。Linux 已实测 `npm run build` 双端通过。
- **唯一原生依赖是 `better-sqlite3`**：`npm install` 通常直接下预编译二进制即可；若命中不到预编译包会回退本地编译，此时 **Windows 需装 Visual Studio Build Tools（C++ 工作负载）+ Python**，macOS 需 Xcode CLT。这是原生模块通病，与本项目代码无关。

---

## 8. HTTP API 速查

所有接口以 `/api` 为前缀，除白名单外均需已登录会话。

**Auth** `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `GET /health`
**Cards** `GET /cards` · `POST /cards` · `GET|PATCH|DELETE /cards/:id` · `POST /cards/compose` · `POST /cards/:id/complete` · `POST /cards/:id/restore` · `DELETE /cards/:id/permanent`
**父子卡** `POST /cards/:parentId/children` · `POST /cards/:parentId/merge` · `POST /cards/:cardId/detach`
**Categories** `GET|POST /categories` · `DELETE /categories/:id`
**Daily Reports** `GET|PUT /daily-reports/:date`
**Preferences** `GET|PATCH /preferences`
**Chat** `POST /chat/sessions` · `GET /chat/sessions/:sessionId/messages` · `POST /chat/sessions/:sessionId/messages`
**Sync** `GET /sync?since=<iso>`（多设备增量同步，服务端用 `updatedAt > since` 边界）

---

## 9. 常用命令

```bash
npm run dev          # 前后端并行热重载（开发）
npm run build        # 前端 tsc+vite build，后端 tsc（双端）
npm start            # 生产：node 起后端并托管前端 dist（单端口 3001）
npm run db:migrate   # 应用 drizzle 迁移
```

分支：`main`（稳定）/ `dev`（开发，当前）。当前版本 `pub 0.99 need test`。

---

## 10. 开发工作流（Spec-Driven）

本项目用 **Cursor + GitHub Spec Kit** 规格驱动开发，规格在 `specs/`（`001-conversational-scheduling` → `008-parent-card-compose`）。第一轮上手见 [`setup.md`](./setup.md)。

```
constitution → specify → clarify → plan → tasks → implement
   项目原则      写规格     澄清歧义    技术方案  拆任务    实现
```

> 约定：改代码/规格走 spec-kit 流程；`.specify/`（含宪法）与 `specs/` 是项目的一等公民，改前先读对应 spec。
