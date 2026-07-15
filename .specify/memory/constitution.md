<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles:
  - I. 单用户安全第一 — 收口为「唯一登录方式：四字符验证码 + HttpOnly 会话」；明确排除密码 / 长令牌 / Bearer / 2FA / IP 白名单；清理 watson:init、WATSON_ACCESS_TOKEN_HASH、长随机访问令牌等历史残留（不再以「已废弃」形式保留）
  - III. AI 能力可插拔 — 正式收敛「AI 能做什么」：侧边 AI 为纯文本对话，MUST NOT 执行日程 CRUD 或触发日程刷新/联动（provider 可插拔机制不变）
  - IV. 数据以「日程卡片」为核心 — 措辞校正：日程增删改查一律经 UI/API；AI 对话不写入日程存储（避免暗示 AI 仍有写数据通路）
- Added sections: none
- Removed sections: none（Technology & Scope「AI 交互范围」与原则 III 对齐为正式约束，不再是待办）
- Templates requiring updates:
  - ✅ updated: .specify/memory/constitution.md (this file)
  - ⚠ pending (人工同步): README.md（产品愿景仍写 AI 增删改查日程；登录描述基本已对齐，AI 作用需改）
  - ⚠ pending (人工同步): setup.md（上手叙述与历史 prompt 中「AI 管日程」表述）
  - ⚠ pending (人工同步): .env.example（若登录/AI 相关注释与 1.2.0 不完全一致则对齐）
  - ⚠ pending: .specify/templates/plan-template.md、spec-template.md、tasks-template.md（原则引用无需大改；Constitution Check 措辞可顺带核对）
  - ⚠ historical: specs/001-* 仍描述旧令牌与 AI 操作日程；specs/003-* 已收敛 AI 纯聊天——以本宪法与当前实现为准
- Follow-up TODOs: none（原「可选 MINOR 修正案同步 AI 交互范围（003 纯聊天）」已由本版完成）
-->

# Watson Constitution

## Core Principles

### I. 单用户安全第一（NON-NEGOTIABLE）

Watson 部署在公网，但 MUST 确保**只有项目所有者本人**能访问、查看或修改任何日程数据。

- 鉴权与会话是一等公民需求，NOT 附加项；任何功能设计 MUST 在受保护会话下运行。
- 未授权访问（含仅凭 URL 即可读写数据）MUST 视为**严重缺陷**，优先级高于功能交付。
- 多设备（手机 / 平板 / PC）登录 MUST 归属于同一所有者，NOT 多用户或协作场景。
- **唯一登录方式**：所有者在登录页输入 **四字符验证码**（默认 `ANNA`，可通过环境变量 `WATSON_ACCESS_CODE` 覆盖）；校验通过后签发 **HttpOnly + SameSite=Strict** 会话 cookie；除 login / health 外，所有 `/api/*` MUST 经会话中间件保护；login 端点 SHOULD 限流防暴力尝试。
- **明确排除**其它任何鉴权方式：MUST NOT 引入用户名密码、长随机访问令牌、Bearer Token、2FA、IP 白名单等；上述均视为超出单用户产品范围。

**Rationale**：Watson 是个人私有日程中枢，公网可达性与数据私密性必须同时成立；安全失败即产品失败。

### II. 密钥外置

所有 **第三方** API Key、Token、服务地址（含 LLM `BASE_URL`）MUST 通过配置文件或环境变量注入。

- 代码中 MUST NOT 硬编码 LLM 密钥、Token 或服务端点。
- 密钥文件（如 `config.yaml`、`.env`）MUST NOT 纳入版本控制；`.gitignore` MUST 覆盖它们。
- 仓库 MUST 提供脱敏的示例配置（如 `config.example.yaml`、`.env.example`），便于部署与 onboarding。
- 日志、错误信息、前端资源 MUST NOT 泄露密钥或完整凭证。
- 单用户访问验证码默认值为 `ANNA`；生产环境 SHOULD 通过 `WATSON_ACCESS_CODE` 覆盖默认值。

**Rationale**：密钥外置是可审计、可轮换、可部署的基本前提；泄露一次即永久损害单用户系统的信任。

### III. AI 能力可插拔

LLM provider（OpenAI、Anthropic Claude、DeepSeek 等 OpenAI 兼容接口）由**用户在使用时自行配置**，代码 MUST NOT 绑定任何单一模型或中转服务。

- AI 集成 MUST 通过可切换的 provider 抽象层实现（统一接口，provider 可替换）。
- 配置项（如 `PROVIDER`、`API_KEY`、`BASE_URL`、`MODEL`）MUST 遵循原则 II（外置注入）。
- 新增 provider SHOULD 仅扩展配置与适配器，NOT 改写核心业务逻辑。
- v1 MUST 至少跑通一个 OpenAI 兼容接口；其余 provider 通过同一抽象扩展。
- **AI 交互范围（当前阶段产品决策）**：侧边 AI 是**纯文本对话板块**，只与所有者自由对话；MUST NOT 执行任何日程的增删改查，也 MUST NOT 触发日程数据的刷新或联动。所有日程操作 MUST 只经 UI 与 REST API 的结构化路径完成。若未来要恢复 AI 直接操作日程，属于重新定义原则范围，MUST 走 MAJOR 修订。

**Rationale**：模型与供应商迭代快，可插拔设计避免 vendor lock-in，并匹配「用户自带 Key」的产品模式。当前收敛 AI 写日程能力，是阶段性产品边界，而非取消对话或改动接入机制。

### IV. 数据以「日程卡片」为核心

所有日程 MUST 以**结构化日程卡片（Schedule Card）**为唯一数据核心，NOT 自由文本或非结构化记录。

每张卡片 MUST 具备以下属性：

- **时间性质**（二选一）：持续型（开始时间 + 结束时间）或截止型（单一 deadline）
- **重要程度**：分级（如 高 / 中 / 低），用于排序与视觉标识
- **紧急程度**：分级（如 高 / 中 / 低），与重要程度构成优先级（如四象限）
- **内容字段**：标题、描述、分类等（具体字段在 data model 中定义）

视图（日 / 周 / 月 / 全部）、筛选、排序 MUST 读写同一份卡片模型；日程增删改查 MUST 一律经 UI/API 结构化路径；AI 对话 MUST NOT 写入日程存储。

**Rationale**：结构化卡片是多视图一致性的共同基础；重要度 × 紧急度支撑智能排序而非仅按时间排列。日程写入路径唯一，避免非结构化旁路。

### V. 多设备一致体验

手机、平板、PC MUST 通过**浏览器**访问同一部署实例，共享同一份数据与同一套交互，NOT 原生 App 或多端分叉代码路径。

- 前端 MUST 采用响应式或自适应布局，保证各设备可用性一致。
- 同一所有者在一台设备上的增删改 MUST 即时反映到其他已登录设备（同数据源、同 API）。
- 交互形态对标 Cursor：主区域为日程视图，侧边为 AI 聊天栏；明暗主题 MUST 在各设备一致可用。
- MUST NOT 为 v1 引入仅单端可用的核心功能。

**Rationale**：「随时随地管理日程」是产品核心价值；多设备一致避免数据分裂与体验碎片化。

## Technology & Scope Constraints

- **技术栈**：Node.js 全栈（Web 前端 + 后端）；浏览器直接访问，v1 不含原生 App。
- **用户模型**：严格单用户；v1 明确排除多用户、协作、共享、第三方日历同步。
- **UI**：控件排布仿照 Cursor（顶部控制栏 + 主视觉区 + 侧边 AI 聊天栏）；支持明 / 暗主题；登录页为独立全屏验证码体验。
- **AI 交互范围**：侧边 AI 为**纯文本对话板块**，只与所有者自由对话；MUST NOT 执行日程增删改查，也 MUST NOT 触发日程刷新或联动。所有日程操作只经 UI 与 REST API。此为当前阶段产品决策；恢复 AI 直接操作日程须 MAJOR 修订。
- **部署**：公网服务器单实例部署；安全与会话原则 MUST 在部署文档中可验证。

## Spec-Driven Development Workflow

本项目采用 **Cursor + GitHub Spec Kit** 规格驱动开发。工作流 MUST 按以下顺序推进，除非宪法修正案另有说明：

```
/speckit-constitution → /speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement
```

- **specify** 阶段只描述 WHAT / WHY，MUST NOT 预设具体技术实现（技术栈归属 **plan** 阶段）。
- 每个 feature 的 `plan.md` MUST 通过 Constitution Check（见 plan 模板）后方可进入实现。
- 实现 MUST 以 `specs/[feature]/` 下的 spec、plan、tasks 为权威依据；偏离 MUST 在 plan 的 Complexity Tracking 中论证。
- 上手与命令说明见 [`setup.md`](../../setup.md)；产品愿景见 [`README.md`](../../README.md)。

## Governance

- 本宪法是 Watson 项目最高治理文档，优先级高于 README、spec、plan 中的任何与之冲突的表述。
- **修订程序**：提出修正案 → 更新本文件并递增 `CONSTITUTION_VERSION` → 同步受影响模板与文档 → 在 Sync Impact Report 中记录变更。
- **版本策略**（语义化）：
  - **MAJOR**：删除或重新定义原则，或向后不兼容的治理变更
  - **MINOR**：新增原则或章节，或实质性扩展指导
  - **PATCH**：措辞澄清、typo、非语义修订
- **合规审查**：每个 feature 的 plan Phase 0 前与 Phase 1 设计后 MUST 复核 Constitution Check；tasks 中 Foundational 阶段 MUST 覆盖安全、配置外置与卡片模型后再开展用户故事。
- **运行时指引**：开发约定与环境见 `README.md` §六、§七 及 `setup.md`。

**Version**: 1.2.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-15
