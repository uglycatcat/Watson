# Research: 日程搜索、编辑增强与视觉重排

**Feature**: `003-schedule-search-edit-visual`  
**Date**: 2026-07-06

## R-001: 全局搜索实现位置

**Decision**: **纯前端**，对 `GET /api/cards?view=all` 结果（或 TanStack `["cards"]` 缓存）做标题模糊匹配。

**Rationale**:
- Spec 排除后端全文检索；单用户卡片量级数百，内存过滤足够
- 002 已全量拉取 all 视图；搜索与 AllView 共享数据源，避免额外 HTTP
- 相关度排序（子串位置、连续匹配、字母序 tie-break）纯客户端可实现且可单测

**Alternatives considered**:

| 方案 | 优点 | 拒绝原因 |
|------|------|----------|
| `GET /api/cards?q=` 新参数 | 服务端过滤 | 卡片量小，YAGNI；增加后端 scope |
| 复用 `searchByTitle` service 暴露 HTTP | 已有函数 | 仅 LLM 内部用；无分散字符匹配 |
| IndexedDB 本地索引 | 离线快搜 | 过度设计；无离线需求 |

---

## R-002: 无时间卡片数据表示

**Decision**: **`time_nature` nullable**；untimed = `timeNature IS NULL` 且 `start_at/end_at/deadline_at` 全 NULL。

**Rationale**:
- Spec 澄清：选了 timeNature 必须填齐时间；无 timeNature 才为无时间
- 与 002 持续型/截止型二分法兼容；不需第三 enum 值
- `cardInRange` 对 untimed 返回 false，日/周/月自然排除

**Alternatives considered**:
- enum 值 `untimed`：需改前后端所有 switch；nullable 更轻
- 仅时间字段 null 但 timeNature 保留：与 spec 澄清 B 冲突

**Validation rules** (create/update):
```
if timeNature is set:
  duration → require startAt; endAt optional (+1h default)
  deadline → require deadlineAt
else:
  require all time fields null (else reject or force clear)
```

---

## R-003: 标题唯一性与 migration 兼容

**Decision**: 添加 **`title` + `title_lower`**（`title_lower` UNIQUE）；迁移脚本 **自动 rename 重复项**。

**Rationale**:
- 参照 `categories.name` / `name_lower`（`category.service.ts`）
- Spec：仅未删除卡片参与；当前为硬删除，删后可复用标题
- 若 DB 已有重名，直接加 UNIQUE 会失败

**Migration 重名处理算法**:
1. 计算 `title_lower = lower(trim(title))` 回填
2. 对每个重复的 `title_lower` 组，按 `created_at ASC` 保留第一条
3. 其余改为 `"{originalTitle} ({n})"` 并重新计算 `title_lower` 直至唯一
4. 创建 UNIQUE INDEX

**API 错误**: HTTP **409** `{ "error": "Title already exists" }`（与 category 409 风格一致）

**Alternatives considered**:
- 仅应用层校验无 DB 约束：竞态可插入重名
- 迁移失败要求手工 SQL：部署体验差

---

## R-004: 全部视图筛选与排序扩展

**Decision**: 扩展 **`CardQueryFilters`** 与 `listAll` 内存过滤（与 002 相同模式）。

**新 query 参数**:

| 参数 | 值 | 说明 |
|------|-----|------|
| `hasTime` | `true` \| `false` | true=有 timeNature；false=无时间 |
| `sort` | 现有 + `title` \| `createdAt` | title 按 `title_lower`；createdAt 按 `created_at` |

**按时间排序（untimed）**: 有时间卡片先排（`sortKey`）；无时间块置后，块内按 `title_lower ASC`。

**组合逻辑**: 各维度 **AND**（spec User Story 6）。

**Alternatives considered**:
- 前端-only 筛选：all 视图已拉全量时可工作，但与 spec FR-013 后端扩展一致更稳
- 聚合 `filter=` JSON：与现有扁平 query 风格不一致

---

## R-005: AI 助手解耦

**Decision**: **`chat.service.sendMessage`** 移除工具循环；单次 LLM chat；返回 `affectedCards: []`。

**Rationale**:
- Spec FR-016：零数据副作用；不要求强制话术（澄清 B）
- 保留 `ChatMessage` 存储与 provider 抽象（宪法 III）
- DeepSeek：`LLM_PROVIDER=deepseek`，`LLM_BASE_URL=https://api.deepseek.com`，不新增 `DEEPSEEK_API_KEY`

**Frontend**: 移除 `ChatPanel` 中 `affectedCards` → `invalidateQueries(["cards"])`.

**Alternatives considered**:
- 保留工具但 no-op handlers：易回归，难验收
- 删除 tools 文件：可 defer；本轮不引用即可

---

## R-006: 搜索相关度评分

**Decision**: 对每个标题计算分数，取 top 8。

**Scoring heuristic** (higher = better):
1. **连续子串匹配**：query 作为子串出现 → base 1000 − indexOf（越靠前越高）
2. **分散字符匹配**：query 字符按序在 title 中出现 → base 500 − 首字符 index − span
3. 无匹配 → 排除
4. **Tie-break**: `title_lower` localeCompare 升序

**Alternatives considered**:
- Levenshtein：过重；spec 要求子串/分散即可
- 按优先级排序：与搜索「找标题」目标不符（spec 澄清否决 D）

---

## R-007: 主题强调色收敛

**Decision**: 仅修改 **`frontend/src/index.css`** CSS 变量。

```css
:root { --accent: #2563eb; }        /* 浅色保持 */
.dark { --accent: #76b900; }       /* NVIDIA 绿 */
```

**Rationale**: setup.md 要求集中变量；`useTheme` 已切换 `.dark` class。

**Follow-up audit**: TopBar 选中态、按钮、`SpanBar`、`ChatPanel` 用户气泡等改用 `var(--accent)` 或 Tailwind 映射（若已有 `@theme` 绑定则只改变量）。

---

## R-008: 卡片详情编辑态

**Decision**: **单 Modal 两态**（view | edit），编辑复用 `CardFormFields` + 共享 `validateCardForm`。

**Rationale**:
- 002 已有 `CardDetailModal` + `CreateCardModal` 表单字段
- PATCH `/api/cards/:id` 已存在（001）；002 未接前端
- 取消编辑丢弃 draft，不 PATCH

**Alternatives considered**:
- 独立 EditCardModal：重复布局
- 内联列表编辑：超出 spec

---

## R-009: 周/月全屏布局

**Decision**: **Flex/Grid + `h-full min-h-0` 链** 从 AppShell `<main>` 到视图根节点。

**Rationale**:
- 002 MonthView 使用固定 `min-h-[88px]` 小格；003 改为 `grid-rows-6 flex-1` 均分
- WeekView 七列 `flex-1` 圆角 `rounded-lg border` 容器纵向延伸
- 保留 SpanBar、DayScheduleDrawer（spec Edge Cases）

**Alternatives considered**:
- `100vh` 硬编码：AppShell 有 TopBar + 可选侧栏，应用 flex 链更稳
