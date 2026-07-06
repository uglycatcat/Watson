# Quickstart: 日程搜索、编辑增强与视觉重排

**Feature**: `003-schedule-search-edit-visual`  
**Purpose**: 003 增量验收指南（在 001/002 环境就绪后执行）

**Prerequisites**: 完成 [001 quickstart](../001-conversational-scheduling/quickstart.md) 与 [002 quickstart](../002-schedule-visual-manual-ops/quickstart.md) 基础环境（dev 运行、已登录、002 视图可用）

## 1. 数据库迁移

```bash
cd /home/anna/MY_WS/watson
npm run db:migrate -w backend
```

确认 `schedule_cards` 含 `title_lower` 列；`time_nature` 可 NULL。

若迁移日志提示重名已自动 rename，可在全部视图核对标题后缀 `(2)` 等。

## 2. 启动

```bash
npm run dev
```

可选 DeepSeek（AI 纯聊天验收）：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=<key>
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

## 3. 验收场景

### 3.1 全局搜索（P1 / FR-001–005）

1. TopBar 可见搜索框；点击后主视图变暗。
2. 创建标题含「测试会议」「周会测试」的卡片；输入「测试」见下拉候选（含中间匹配）。
3. 输入「测X试」对「测X试Y验」类标题分散匹配命中。
4. 超过 8 条匹配时仅显示 8 条 + 收窄提示。
5. 点击候选 → 详情 Modal；Escape → 变暗消失。
6. 无匹配时显示空状态。

### 3.2 仅标题创建 + 无时间（P4 / FR-006–007）

1. 「+」→ 仅填标题 → Enter 或提交 → 成功。
2. 日/周/月视图不可见；全部视图可见。
3. 选时间性质但不填时间 → 拒绝并提示。
4. 标题为空 Enter → 不创建。

### 3.3 标题唯一（P3 / FR-011–012）

1. 已有「周会」→ 创建「周会」「 周会 」「周会」均 409/提示。
2. 编辑 B 改为「周会」→ 拒绝；编辑 A 改描述保持「周会」→ 成功。
3. 删除「周会」后 → 可新建「周会」。

### 3.4 详情编辑（P2 / FR-009–010）

1. 任意视图点卡片 →「编辑」→ 改标题/时间 → 保存 → 各视图刷新。
2. 清空时间性质保存 → 变无时间，日历视图消失。
3. 取消编辑 → 无变更。

### 3.5 全部视图筛选排序（P6 / FR-013–014）

1. 筛选：分类、重要度、紧急度、时间性质、有无时间 — 组合 AND。
2. 排序：时间 / 优先级 / 标题 / 创建时间。
3. 无时间卡片在「按时间」排序时位于有时间卡片之后。
4. 002 重要度筛选仍可用。

### 3.6 AI 解耦（P7 / FR-015–016）

1. 发送「帮我添加明天会议」「删除所有日程」→ 卡片数量不变。
2. 主视图不因 AI 回复自动 refresh（除手动操作）。
3. 仍收到 AI 文本回复（LLM 已配置时）。

### 3.7 视觉（P8–P10 / FR-017–020）

1. **日/全部**：圆角卡片网格排列；窄屏换列不溢出。
2. **周**：七列圆角列铺满主区；空列保留。
3. **月**：日历网格铺满主区（非居中小网格）。
4. **主题**：浅色强调色仍为蓝；深色为 NVIDIA 绿（按钮/选中态）。

### 3.8 002 回归

1. 月视图跨格条带、日抽屉、+N 更多仍可用。
2. 删除二次确认仍有效。
3. 助手栏显隐/宽度、主题二态不变。

---

## 4. 自动化抽检（可选）

```bash
npm test -w backend    # schedule.service 无时间/重名/sort
npm test -w frontend   # titleSearch 相关度排序
```

---

## 5. 故障排查

| 现象 | 检查 |
|------|------|
| 迁移失败 UNIQUE | DB 重名未清理；查 migration dedupe 日志 |
| 409 但 UI 无提示 | 前端是否解析 `Title already exists` |
| 搜索无结果 | `view=all`  query 是否缓存；标题是否匹配 |
| AI 仍改卡片 | chat.service 是否仍传 LLM_TOOLS |
| 深色仍蓝色 | index.css `--accent` 与硬编码 class |

**Next**: `/speckit-tasks` 生成实现任务清单。
