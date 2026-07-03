# watson

使用 **Cursor + GitHub Spec Kit** 进行规格驱动开发（Spec-Driven Development）的项目。

## 开发工作流

在 Cursor Agent 中依次使用以下 skills / 斜杠命令：

1. `/speckit-constitution` — 确立项目原则（写入 `.specify/memory/constitution.md`）
2. `/speckit-specify` — 编写基线规格
3. `/speckit-plan` — 生成实现方案
4. `/speckit-tasks` — 拆解为可执行任务
5. `/speckit-implement` — 执行实现

可选增强：`/speckit-clarify`（规划前澄清歧义）、`/speckit-analyze`（一致性检查）、`/speckit-checklist`（质量清单）。

## 约定

- 密钥 / Token / 服务地址放入 `config.yaml` 或 `.env`，**不纳入版本控制**（见 `.gitignore`），并提供脱敏的 `config.example.*`。
- `.cursor/` 已加入 `.gitignore`（可能含凭证）。

## 环境

- Spec Kit CLI 通过 `uvx --from git+https://github.com/github/spec-kit.git specify ...` 运行（`uv` 在 `~/.local/bin`）。
- Node `v22`、git 已就绪。
