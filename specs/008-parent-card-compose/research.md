# Phase 0 Research: 日程卡片组合与父卡片

**Feature**: `008-parent-card-compose`  
**Date**: 2026-07-21

## R1 — 同表 kind/parentId 与 migration 兼容

**Decision**:
- 在 `schedule_cards` 增加：
  - `kind` TEXT NOT NULL DEFAULT `'standard'`（`standard` | `parent`）
  - `parent_id` TEXT NULL（自引用 `schedule_cards.id`，仅 standard 可非空）
  - `time_manual` INTEGER NOT NULL DEFAULT `0`（仅 parent 有意义；1=手调过时间）
  - `last_parent_title` TEXT NULL（子卡进垃圾箱时写入的父名快照）
- Migration `0011_parent_cards.sql`：`ALTER TABLE` 加列 + 历史行自然得默认值 + `CREATE INDEX idx_cards_parent_id ON schedule_cards (parent_id)`。
- 走既有 `db/migrate.ts` / 启动时 `runMigrations()`；幂等重跑安全。

**Rationale**:
- 与 clarify 定案一致：父卡是同模型新类型，不是第二张表。
- SQLite `DEFAULT` 覆盖历史行，无需逐行 UPDATE 脚本（与 0007 stage 同模式）。
- `parent_id` 索引支撑「按父查子」「清零计数」。

**Alternatives considered**:
- 独立 `parent_cards` 表：双模型同步与唯一标题跨表，复杂度高，拒绝。
- 仅用邻接表不设 kind：父卡与标准卡难区分默认字段，拒绝。
- 重建整表：无必要，拒绝。

## R2 — 父卡 categoryId NOT NULL 占位

**Decision**: 创建父卡时 **`categoryId = 'system-none'`**（系统「无」分类）；`importance=5`、`urgency=5`、`stage='not_started'`、`description=null`。API/UI 对 `kind=parent` **忽略**这些字段；不修改 `category_id NOT NULL` 约束，不新增可空。

**Rationale**:
- 保持既有 FK 与「无」兜底体系，migration 最简单、旧数据零风险。
- 父卡本就不参与分类/阶段/优先级语义；占位值对 list 过滤见 R4。

**Alternatives considered**:
- 放宽 `category_id` 可空：需重建表或复杂 migration，收益低，拒绝。
- 为父卡新建隐藏分类：多余实体，拒绝。

## R3 — 父卡时间汇总：后端维护与触发点

**Decision**: 包络计算与 `timeManual` 策略**只在后端** `ScheduleService` 内执行。

**包络定义**（仅统计 `status=active` 且 `parentId=P` 且已安排的子卡）：
- 若无已安排子卡 → 父卡 `startAt=endAt=null`（未安排），并可将 `timeManual` 重置为 false（无可保边界）
- 否则 `envStart = min(子.startAt)`，`envEnd = max(子.endAt)`

**应用规则** `recomputeParentTime(parentId)`：
1. `timeManual === false` → 父卡时间设为包络（或全空）
2. `timeManual === true` → 保留当前时间，但若 `parent.startAt > envStart` 则扩展 start；若 `parent.endAt < envEnd` 则扩展 end；不得收窄
3. 用户 PATCH 父卡时间：校验 `start ≤ envStart && end ≥ envEnd`（有已安排子卡时）；通过后写入并设 `timeManual=true`；若用户改回恰好等于当前包络，仍保持 `timeManual=true`（避免误缩）——除非全部子卡未安排则强制空时间且 `timeManual=false`

**触发点**（均在同一写事务末尾调用，针对受影响的父卡 id 集合）：

| 事件 | 动作 |
|------|------|
| compose 创建父卡 | 建父卡后按确认框时间写入；若时间宽于包络则 `timeManual=true`，否则 false 并对齐包络 |
| addChild / mergeParents | 改 parentId 后 recompute 目标父；merge 源父硬删 |
| detachChild | 清 parentId 后 recompute 原父；可能清零硬删 |
| update 子卡 start/end | 若有 parentId → recompute 该父 |
| complete / delete 子卡 | 快照父名 → 清 parentId → recompute/清零 |
| restore 归入父卡 | 设 parentId 后 recompute |
| PATCH 父卡时间 | 校验后写入 + timeManual |

**Rationale**:
- 单处真相避免前后端包络漂移；多设备刷新一致。
- 显式 `timeManual` 比「推断是否等于旧包络」更稳（子卡伸缩边界情况）。

**Alternatives considered**:
- 纯前端算时间再 PATCH：多端竞态与遗漏触发，拒绝。
- 无 `timeManual`、每次都对齐包络：无法「手调更宽后保留」，拒绝。

## R4 — listAll 可见性口径

**Decision**: 在 `ScheduleService.listAll` 内按 `view` 过滤（先取 status/date 等候选，再应用父卡规则）：

| view | 返回 | 不返回 |
|------|------|--------|
| `all` | `kind=parent` 的 active 父卡；`kind=standard && parentId IS NULL` 的独立标准卡 | 有 `parentId` 的标准子卡 |
| `week` / `month` | 同上，且父卡/独立卡须已安排并与日期区间相交（沿用 `cardInRange`） | 子卡；未安排父卡 |
| `day` | `kind=standard` 且与日区间相交的卡（**含**有 `parentId` 的子卡） | 任何 `kind=parent` |
| `trash` | `status in (completed,deleted)` 的标准卡；DTO 带 `lastParentTitle` | 任何父卡行（父卡永不进垃圾箱） |

**过滤器交互（all）**：
- `scheduled` / 排序：父卡与独立标准卡同等适用（父卡时间即其 start/end）。
- `categoryId` / `stage` / `importance` / `urgency`：**仅作用于独立标准卡**；父卡在这些维度上不筛掉（避免占位 `system-none` 导致父卡被误藏）。若请求带了这类过滤，父卡仍返回；子卡仍不出现在一级列表。
- `day` 不应用 stage 筛选（与现网一致）。

**DTO 补充**：
- 父卡：`childCount` = 当前 active 且 `parentId=该父` 的标准卡数量。
- 日视图子卡：可选 `parentTitle`（join 当前父卡 title，供折页 hover）；`parentId` 必带。

**Rationale**: 可见性是产品核心；放在查询层保证周/月/全部/日/垃圾箱与坐标图数据源一致，前端只做展示。

**Alternatives considered**:
- 后端返回全量、前端折叠：浪费带宽且易漏藏，拒绝。
- 父卡受 category 过滤：占位分类会误伤，拒绝。

## R5 — 清零硬删与完成/删除时移出

**Decision**:
- 子卡 `complete` / `delete`：若存在 `parentId`，先把当前父卡 `title` 写入 `lastParentTitle`，再将 `parentId=null`，再设 status/trashedAt；然后 `recomputeParentTime`；若该父 active 子计数为 0 → **`DELETE FROM schedule_cards WHERE id=? AND kind='parent'`**（硬删，不写 trashedAt）。
- `detachChild`：仅清 `parentId`，不写 `lastParentTitle`；同样可能清零硬删。
- 父卡 API **不提供** complete/delete；若误调对 `kind=parent` 返回 400/405。

**Rationale**: 与 spec「父卡不进垃圾箱、清零消失」一致；快照保证垃圾箱仍能标注原父名。

**Alternatives considered**:
- 父卡软删：违反 spec，拒绝。
- 完成子卡时保留 parentId 指向已删父：父已硬删会悬空，拒绝。

## R6 — 恢复归回 / 重建与重名下划线

**Decision**: 扩展 `restore(id)`：
1. 仅允许 completed/deleted 的 **standard** 卡（父卡无垃圾箱路径）。
2. 若 `titleLower` 与某 active 卡冲突：在 title 前加 `_`，重算 titleLower，循环直至 `assertTitleUnique` 通过（写回 title）。
3. 若 `lastParentTitle` 非空：
   - 查 active 且 `kind=parent` 且 `titleLower === normalize(lastParentTitle)` → 设 `parentId` 归入
   - 否则创建新父卡（title=`lastParentTitle`，若撞名则对**父卡标题**同样加 `_` 前缀直至唯一；category=`system-none`；时间先空再 recompute），再设 `parentId`
4. 清 `lastParentTitle`、status=active、trashedAt=null；recompute 所属父。

**Rationale**: 对齐 spec FR-018/019；复用既有 normalize + unique 体系。

**Alternatives considered**:
- 恢复时撞名直接 409：与本轮「自动下划线」定案冲突，拒绝。
- 用 parentId 残值归回：父可能已硬删，不可靠，改用标题快照。

## R7 — 组合 API 形状与事务

**Decision**:
- `POST /api/cards/compose`：`{ cardIds: [idA, idB], title, startAt?, endAt? }` — 两张独立 active 标准卡 → 事务内 insert 父卡 + 更新两子 `parentId`。
- `POST /api/cards/:parentId/children`：`{ cardId }` — 独立标准卡加入父卡。
- `POST /api/cards/:parentId/merge`：`{ sourceParentId }` — 源父所有 active 子改指目标父，硬删源父。
- `POST /api/cards/:cardId/detach`：清 `parentId`。
- 全部单事务；失败回滚。

**Rationale**: 路径语义清晰，便于前端三条拖拽路径一一映射。

**Alternatives considered**:
- 单一 `/compose` 带 action 枚举：省路由但难读，次选。
- 仅用 PATCH parentId：缺创建父卡与合并原子性，拒绝。

## R8 — 前端 DnD 共存

**Decision**: 保持 MIME `application/x-watson-card`。  
- `TopBar` 垃圾箱：`onDrop` → 既有 `deleteCard`（不变）。  
- `CardGrid`（仅 AllView 启用 `composeDrop`）：卡片/父卡上 `onDragOver`/`onDrop` → compose / addChild / merge；父→标准显示禁止态且不调用 API。  
- 落点互斥：事件在各自 DOM 目标上处理，不共享一个全局 drop 处理器。

**Rationale**: 最小改动复用既有拖拽基础设施；产品要求靠落点区分。

**Alternatives considered**:
- 第二套 MIME：增加复杂度，无必要，拒绝。
- 长按菜单代替拖拽组合：偏离定案，拒绝。

## R9 — 坐标图与标准卡专有字段

**Decision**: `QuadrantView` 输入列表过滤 `kind !== 'parent'`；日视图传入的子卡（含 parentId）照常按其 importance/urgency 定位。父卡 UI 不渲染优先级条/分类色带/阶段徽章/完成框。

**Rationale**: 规格明确坐标图不受本轮影响。

## Open items deferred to tasks/implement

- 具体 fly-to 动效参数（沿用 006/007 token，tasks 中挂钩）
- `GET /api/cards/:id` 是否内嵌 `children` 数组 vs 二次查询（实现选内嵌以减往返，见 contracts）
