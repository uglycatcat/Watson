<!--
Sync Impact Report
- Version change: (unfilled template) → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections:
  - Core Principles (5)
  - Technology & Scope Constraints
  - Spec-Driven Development Workflow
  - Governance
- Removed sections: Template placeholders
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md (Constitution Check gates)
  - ✅ updated: .specify/templates/tasks-template.md (foundational task examples)
  - ✅ no change needed: .specify/templates/spec-template.md (generic structure remains valid)
  - N/A: .specify/templates/commands/ (directory does not exist)
  - ✅ no change needed: README.md, setup.md (already aligned with principles)
- Follow-up TODOs: none
-->

# Watson Constitution

## Core Principles

### I. 单用户安全第一（NON-NEGOTIABLE）

Watson 部署在公网，但 MUST 确保**只有项目所有者本人**能访问、查看或修改任何日程数据。

- 鉴权与会话是一等公民需求，NOT 附加项；任何功能设计 MUST 在受保护会话下运行。
- 未授权访问（含仅凭 URL 即可读写数据）MUST 视为**严重缺陷**，优先级高于功能交付。
- 多设备（手机 / 平板 / PC）登录 MUST 归属于同一所有者，NOT 多用户或协作场景。
- 具体鉴权方案（强密码 + 会话、单用户凭证、设备白名单、双因素等）在 spec / plan 阶段确定，
  但安全目标不可妥协。

**Rationale**：Watson 是个人私有日程中枢，公网可达性与数据私密性必须同时成立；安全失败即产品失败。

### II. 密钥外置

所有 API Key、Token、服务地址（含 LLM `BASE_URL`）MUST 通过配置文件或环境变量注入。

- 代码中 MUST NOT 硬编码密钥、Token 或服务端点。
- 密钥文件（如 `config.yaml`、`.env`）MUST NOT 纳入版本控制；`.gitignore` MUST 覆盖它们。
- 仓库 MUST 提供脱敏的示例配置（如 `config.example.yaml`、`.env.example`），便于部署与 onboarding。
- 日志、错误信息、前端资源 MUST NOT 泄露密钥或完整凭证。

**Rationale**：密钥外置是可审计、可轮换、可部署的基本前提；泄露一次即永久损害单用户系统的信任。

### III. AI 能力可插拔

LLM provider（OpenAI、Anthropic Claude、DeepSeek 等）由**用户在使用时自行配置**，代码 MUST NOT 绑定任何单一模型或中转服务。

- AI 集成 MUST 通过可切换的 provider 抽象层实现（统一接口，provider 可替换）。
- 配置项（如 `PROVIDER`、`API_KEY`、`BASE_URL`、`MODEL`）MUST 遵循原则 II（外置注入）。
- 新增 provider SHOULD 仅扩展配置与适配器，NOT 改写核心业务逻辑。
- v1 MUST 至少跑通一个 OpenAI 兼容接口；其余 provider 通过同一抽象扩展。

**Rationale**：模型与供应商迭代快，可插拔设计避免 vendor lock-in，并匹配「用户自带 Key」的产品模式。

### IV. 数据以「日程卡片」为核心

所有日程 MUST 以**结构化日程卡片（Schedule Card）**为唯一数据核心，NOT 自由文本或非结构化记录。

每张卡片 MUST 具备以下属性：

- **时间性质**（二选一）：持续型（开始时间 + 结束时间）或截止型（单一 deadline）
- **重要程度**：分级（如 高 / 中 / 低），用于排序与视觉标识
- **紧急程度**：分级（如 高 / 中 / 低），与重要程度构成优先级（如四象限）
- **内容字段**：标题、描述、分类等（具体字段在 data model 中定义）

视图（日 / 周 / 月 / 全部）、筛选、排序与 AI 操作 MUST 读写同一份卡片模型；AI MUST NOT 绕过卡片结构直接篡改存储。

**Rationale**：结构化卡片是自然语言交互与多视图一致性的共同基础；重要度 × 紧急度支撑智能排序而非仅按时间排列。

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
- **UI**：控件排布仿照 Cursor（顶部控制栏 + 主视觉区 + 侧边 AI 聊天栏）；支持明 / 暗主题。
- **AI 交互范围（v1）**：「你说 AI 做」——自然语言完成日程增删改查；排除主动智能（自动排期、冲突检测、习惯学习）。
- **部署**：公网服务器单实例部署；安全与密钥原则 MUST 在部署文档中可验证。

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
  - **PATCH**：措辞澄清、 typo、非语义修订
- **合规审查**：每个 feature 的 plan Phase 0 前与 Phase 1 设计后 MUST 复核 Constitution Check；tasks 中 Foundational 阶段 MUST 覆盖安全、配置外置与卡片模型后再开展用户故事。
- **运行时指引**：开发约定与环境见 `README.md` §六、§七 及 `setup.md`。

**Version**: 1.0.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-03
