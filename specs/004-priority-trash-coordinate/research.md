# Research: 优先级量化、垃圾箱与坐标视图

**Feature**: `004-priority-trash-coordinate`  
**Date**: 2026-07-15

## R-001: 三处 Migration 顺序与 SQLite 改列策略

**Decision**: 严格串行 **`0002_priority_numeric` → `0003_time_model` → `0004_card_lifecycle`**；每步可独立回滚验证。SQLite 对 CHECK/类型变更用「新列 → 回填 → drop 旧列 → rename」或整表 rebuild（与 0001 同源流派）。

**Rationale**:
- 优先级映射不依赖生命周期，可最先落地并单独测 DTO
- 时间模型改写 `cardInRange`/校验，应在生命周期过滤之前稳定
- 部分唯一索引依赖 `status` 列，必须放在生命周期 migration

**Alternatives considered**:

| 方案 | 拒绝原因 |
|------|----------|
| 单文件三合一 migration | 失败难定位；与「三处 migration」验收口径不符 |
| 先 lifecycle 再时间 | 标题唯一改造与时间无关，但软删语义依赖查询基线，仍建议时间模型先稳 |

**0002 映射 SQL 语义**:
```
high → 8, medium → 5, low → 2；其它/NULL → 5
```
写路径校验 `0 <= n <= 10` 整数。

---

## R-002: 时间模型 — 停用 timeNature；截止型清空为未安排

**Decision**:
- **已安排** ⇔ `start_at IS NOT NULL`
- **未安排** ⇔ `start_at IS NULL AND end_at IS NULL`（且业务层不再使用 `deadline_at`）
- Migration：`time_nature = 'duration'` → 保留 start/end；`time_nature = 'deadline'` → **清空 start/end/deadline 与 time_nature**（澄清 D）
- 应用层：停止接受/返回业务意义的 `timeNature`；`deadlineAt` 恒 null 或列废弃
- 非法：`end_at` 有值但 `start_at` 空 → 400；`end_at < start_at` → 400

**Rationale**: Spec 澄清明确拒绝「仅留截止」；新模型无截止型语义，残留 deadline 会造成视图歧义。

**冲突记录**: setup.md 计划段落曾写「旧截止型起始置空、仅留截止」→ **作废**，以 Clarifications Session 2026-07-15 Q1=D 为准。

**Alternatives considered**:
- deadline → startAt：利于日历保留，但与用户定案不符
- 保留 timeNature 列只读兼容：增加 API 噪音；决定列可物理保留但 API DTO 不再暴露（或恒 null）

**过滤口径（前后端一致）**:

| view | active 未安排 | active 已安排 |
|------|---------------|---------------|
| day/week/month | 排除 | `cardInRange` |
| all | 包含 | 包含 |
| trash | 仅 completed/deleted，不论时间 | 同左 |
| 坐标（日） | 无（日视图本无未安排） | 当日 active |
| 坐标（全部） | 包含 | 包含 |

Query：`scheduled=true|false` 替换 `hasTime` / `timeNature`（deprecated：若传入可 400 或忽略并文档标明废弃）。

---

## R-003: 生命周期状态机与 API 形状

**Decision**:
```
active ──complete──► completed (trashed_at=now)
active ──softDelete─► deleted   (trashed_at=now)
completed|deleted ──restore──► active (trashed_at=NULL)  // 若 title 与其他 active 冲突 → 409
completed|deleted ──permanentDelete──► 物理删除
```

**HTTP**:

| 操作 | 方法 | 说明 |
|------|------|------|
| 完成 | `POST /api/cards/:id/complete` | 无二次确认需求（后端幂等：已 completed 可 200） |
| 软删 | `DELETE /api/cards/:id` | 改为软删；替代 003 硬删 |
| 恢复 | `POST /api/cards/:id/restore` | |
| 永久删 | `DELETE /api/cards/:id/permanent` | 或 `?permanent=true`；本 plan 采用 **独立路径** 避免误删 |
| 列表常规 | `GET /api/cards?view=…` | **仅 active** |
| 垃圾箱 | `GET /api/cards?view=trash` | completed+deleted，`trashedAt DESC` |
| 单卡 | `GET /api/cards/:id` | active 与箱内均可；供搜索/只读详情 |

**Rationale**: 与 setup「PATCH 完成 / DELETE 软删」等价，独立 `complete`/`permanent` 路径比 overload PATCH/DELETE 更不易误用。

**updatedAt**: 列已存在；**内容** create/PATCH 刷新；complete/softDelete/restore **不要求**改 `updatedAt`（进箱时间用 `trashed_at`）。永久删除无行。

---

## R-004: 标题唯一 — 仅 active

**Decision**: 删除全表 `UNIQUE(title_lower)`；创建  
`CREATE UNIQUE INDEX idx_cards_title_lower_active ON schedule_cards(title_lower) WHERE status = 'active'`。  
应用层 `assertTitleUnique` 仅查 active；恢复前再断言。

**Rationale**: Spec 澄清 + setup 倾向；completed/deleted 不占标题；与「永久删除后可复用」一致且更早释放。

**Alternatives considered**:
- active+completed 唯一：完成项仍占名，妨碍重建同名待办
- 仅应用层无 DB 约束：并发双开可撞车（单用户风险低但不如部分索引干净）

---

## R-005: 坐标视图分桶与渲染

**Decision**:
- 坐标系：原点 **(urgency=5, importance=5)**；X=紧急 0..10 右增；Y=重要 0..10 上增
- 分桶键：`(urgency, importance)` 整数精确相等
- 圆半径：`r = min(rMax, rMin + k * (count - 1))`（实现时定常数）
- **仅 hover** 列出任务名（可滚动看全，或前若干条 + `+N`）；**click 无额外行为**（澄清 Q5=A；analyze I2 定案）
- 数据：当前视图 **active** 卡集合（日＝当日 range；全部＝all active 含未安排）
- 实现：**SVG**（易与 React 状态共存；无需 canvas 指针命中复杂化）

**Alternatives considered**: canvas、强制四象限色块、点击打开详情 — 均超出或违背澄清。

---

## R-006: 全局搜索含垃圾箱

**Decision**: 前端并行（或顺序）拉取 `view=all` + `view=trash`，客户端 `titleSearch` 合并；候选项带 `status` 角标文案「已完成」「已删除」；点击 → 只读详情（`GET /api/cards/:id`）。

**Rationale**: 无新搜索引擎；澄清要求含箱；双请求在单用户规模可接受。

**Alternatives considered**: `includeTrash=true` 单端点 — 可选优化，非必须。

---

## R-007: 详情即时编辑与箱内只读

**Decision**: 活跃详情始终可编；快照 + dirty「**重置**」；「确认」PATCH 后关；遮罩丢弃。箱内只读：无确认保存、无完成方框；生命周期「**恢复**/永久删除」在 TrashView（详情旁可复用同 mutation，仍不编辑字段）。文案「重置」≠「恢复」。

**Rationale**: 澄清 Q2=B。

---

## R-008: 全部视图筛选替换

**Decision**: UI 去掉 timeNature / hasTime；改为 `scheduled=true|false`。importance/urgency 筛选项改为 **整数精确匹配**（0–10 选择器或下拉）。

**Rationale**: 澄清 Q4=A。

---

## R-009: AI 默认隐藏与去登出

**Decision**: `useChatPanelLayout` 默认 `chatOpen=false`（无 session 键时）；TopBar 移除 logout 调用与按钮，换垃圾桶导航到 `view=trash`；会话仍靠 cookie 过期。

**Rationale**: Spec FR-007/018；单用户登出无价值。

---

## R-010: 宪法 IV 措辞滞后

**Decision**: 本 feature **不阻塞**；plan Complexity 已记；implement 前后单独 `/speckit-constitution` 或 PR 内 MINOR：将「时间性质」「高/中/低」改为「已安排/未安排」「0~10」。

**Rationale**: 原则意图未破坏，仅字面过时。
