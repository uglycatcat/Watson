# Quickstart: 对话式日程管理

**Feature**: `001-conversational-scheduling`  
**Purpose**: 端到端验证指南（实现完成后按此验收）

## Prerequisites

- Node.js **v22+**
- npm **10+**
- 一个 OpenAI-compatible LLM API Key（OpenAI / DeepSeek 等）

## 1. 初始化项目

```bash
cd /home/anna/MY_WS/watson
npm install                    # workspaces: backend + frontend
cp config.example.yaml config.yaml
cp .env.example .env
npm run watson:init            # 生成 WATSON_ACCESS_TOKEN，写入 .env，输出明文 token（仅一次）
```

编辑 `.env`（或 `config.yaml`）：

```env
LLM_API_KEY=sk-...
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
SESSION_SECRET=<random-32-chars>
```

## 2. 数据库迁移

```bash
npm run db:migrate -w backend
```

预期：创建 `data/watson.db`，seed 三个默认分类。

## 3. 启动开发环境

```bash
npm run dev
```

预期：
- 后端 API：`http://localhost:3000/api/health` → `{ "status": "ok" }`
- 前端：`http://localhost:3000`

## 4. 验收场景

### 4.1 认证（P1 / SC-005）

1. 未登录访问 `http://localhost:3000` → 跳转登录页，无日程数据。
2. 粘贴 init 输出的 token → 进入主界面。
3. 错误 token → 401，无数据泄露。
4. 新隐身窗口访问 API `GET /api/cards` → 401。

### 4.2 自然语言添加（P2 / SC-002）

1. 在侧边聊天栏输入：`下周一上午十点体检`
2. 预期：助手确认已创建；主区域出现卡片；持续型；默认 1h 时长。
3. 输入：`3月15日前提交报告，很重要`
4. 预期：截止型卡片；importance=high。

### 4.3 查询（P3 / SC-003）

1. 问：`我这周三有什么安排？`
2. 预期：列表与主区域日视图数据一致，无编造。
3. 问：`最近有没有 deadline 快到了？`
4. 预期：仅列出 `due_soon_days` 窗口内截止型卡片（默认 7 天）。

### 4.4 修改与删除（P4 / FR-008）

1. `把周会改到下午四点` → 卡片时间更新。
2. `取消明天的牙医预约` → 助手先问「确定删除…吗？」
3. 回复 `确定` → 卡片消失。
4. 再次删除流程，回复 `不要` → 卡片保留。

### 4.5 多视图（P5 / SC-007）

1. 切换日 / 周 / 月 / 全部视图，卡片正确展示。
2. 全部视图：筛选 importance=high，排序 priority。

### 4.6 多设备同步（SC-006）

1. 设备 A 添加卡片。
2. 设备 B 已打开 Watson 标签页 → 切到后台再切回。
3. 预期：5 秒内主区域出现新卡片（无需手动刷新）。

### 4.7 LLM 未配置

1. 清空 `LLM_API_KEY`，重启。
2. 预期：日程只读浏览正常；聊天发送返回 503 与友好提示。

### 4.8 主题

1. 顶部切换明/暗主题 → UI 立即切换，刷新后保持（`owner_preferences.theme`）。

## 5. 运行测试

```bash
npm test                       # 全部 workspace
npm run test:contract -w backend   # 对照 contracts/openapi.yaml
```

## 6. 生产构建

```bash
npm run build
NODE_ENV=production npm start -w backend
```

预期：单端口服务静态前端 + API。

## 7. 备份

```bash
cp data/watson.db data/watson.db.bak
# 备份 .env（含 token hash，非明文 token）
```

## 相关文档

- [spec.md](./spec.md) — 功能需求
- [plan.md](./plan.md) — 技术方案
- [data-model.md](./data-model.md) — 数据模型
- [contracts/openapi.yaml](./contracts/openapi.yaml) — REST API
- [contracts/llm-tools.md](./contracts/llm-tools.md) — LLM tools
