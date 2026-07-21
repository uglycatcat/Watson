# Tasks: 日程卡片组合与父卡片

**Input**: Design documents from `/specs/008-parent-card-compose/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: 本特性未要求 TDD 或新测试框架。各用户故事含基于 [quickstart.md](./quickstart.md) 的独立验证任务；最终阶段执行 build、migration smoke 与 001～007 回归。

**Organization**: 按 `spec.md` 用户故事优先级组织；P1 → P2 → P3。后端地基（schema / 包络 / listAll）在 Foundational 完成后再开故事。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可在不同文件上并行，且不依赖尚未完成的同阶段任务
- **[Story]**: 对应 `spec.md` 的 User Story（US1…US7）
- 所有任务都给出具体文件路径

## Phase 1: Setup（共享准备）

**Purpose**: 确认在现有 monorepo 上迭代，无新增 npm 依赖。

- [X] T001 确认根与 `frontend/package.json` / `backend/package.json` 无需新依赖；`npm run build` 在改动前基线可通过

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: migration、共享类型、父卡时间维护原语、`listAll` 可见性与 DTO 映射；本阶段完成前不得开展用户故事 UI/组合 API。

**⚠️ CRITICAL**: 无 story 工作可在 T002～T010 完成前开始。

- [X] T002 在 `backend/drizzle/0011_parent_cards.sql` 与 `backend/drizzle/meta/_journal.json` 添加 `kind`（默认 `standard`）、`parent_id`、`time_manual`（默认 0）、`last_parent_title` 及 `idx_cards_parent_id`
- [X] T003 在 `backend/src/db/schema.ts` 同步 `kind`/`parentId`/`timeManual`/`lastParentTitle` 列、自引用与索引的 Drizzle 定义
- [X] T004 [P] 在 `backend/src/types.ts` 扩展 `ScheduleCardDto`：`kind`、`parentId`、`parentTitle?`、`childCount?`、`timeManual?`、`lastParentTitle?`、`children?`
- [X] T005 [P] 在 `frontend/src/lib/api.ts` 扩展 `ScheduleCard` 同名字段与 `CardKind` 类型，保持既有查询参数不变
- [X] T006 在 `backend/src/services/schedule.service.ts` 实现 `computeEnvelope`、`recomputeParentTime`、`countActiveChildren`、`hardDeleteParentIfEmpty`（清零硬删，不写 trashedAt）
- [X] T007 在 `backend/src/services/schedule.service.ts` 重构 `listAll`：按 [contracts/api-usage.md](./contracts/api-usage.md) 实现 all/week/month/day/trash 可见性；category/stage/importance/urgency 过滤仅作用于独立标准卡
- [X] T008 扩展 `backend/src/services/schedule.service.ts` 的 row→DTO 映射：父卡 `childCount`、日视图子卡 `parentTitle`、垃圾箱 `lastParentTitle`；`POST /api/cards` 创建路径强制 `kind=standard`、`parentId=null`
- [X] T009 扩展 `GET /api/cards/:id` 在 `backend/src/routes/cards.ts` + service：父卡返回按 `createdAt` 升序的 `children` 数组
- [X] T010 用临时库执行 `DATABASE_PATH=/tmp/watson-008-empty.db npm run db:migrate`（及一份升级库）验证 0011 幂等与历史行默认值，对照 [quickstart.md](./quickstart.md) V0

**Checkpoint**: 迁移可用；DTO 含新字段；listAll 口径正确；包络/清零原语可被后续 compose 调用；鉴权与 AI 边界未变。

---

## Phase 3: User Story 1 — 在全部视图把标准卡片组合成父卡片（Priority: P1）🎯 MVP

**Goal**: 全部视图可将两张独立标准卡经确认框组成父卡；标准卡拖入已有父卡直接加入；「+」不能建父卡。

**Independent Test**: [quickstart.md](./quickstart.md) V2 步骤 1～2 + V6 步骤 1～2；all 见父不见子。

- [X] T011 [US1] 在 `backend/src/services/schedule.service.ts` 实现 `compose({ cardIds, title, startAt?, endAt? })`：事务内建 `kind=parent`（`categoryId=system-none`）、设两子 `parentId`、按确认时间设 `timeManual`、调用 `recomputeParentTime`
- [X] T012 [US1] 在 `backend/src/services/schedule.service.ts` 实现 `addChild(parentId, cardId)`：仅独立 active 标准卡可加入；事务末 recompute
- [X] T013 [US1] 在 `backend/src/routes/cards.ts` 注册 `POST /api/cards/compose` 与 `POST /api/cards/:parentId/children`，映射 400/404/409
- [X] T014 [P] [US1] 在 `frontend/src/lib/api.ts` 增加 `composeParent`、`addChildToParent` 客户端方法
- [X] T015 [P] [US1] 在 `frontend/src/hooks/useCardMutations.ts` 封装 compose/addChild mutation，成功后 invalidate `["cards"]`
- [X] T016 [US1] 新建 `frontend/src/components/cards/CreateParentModal.tsx`：必填名称就地校验、默认可改时间、待纳入列表、取消/确认调用 compose
- [X] T017 [US1] 扩展 `frontend/src/components/ScheduleViews/CardGrid.tsx`：父卡渲染分支（堆叠影占位 + `childCount` 徽章、隐藏标准卡专有元素）；支持 `enableComposeDrop` 下标准→标准打开 CreateParentModal、标准→父调用 addChild
- [X] T018 [US1] 修改 `frontend/src/components/ScheduleViews/AllView.tsx` 向 CardGrid 传入 `enableComposeDrop`；父卡点击在 US1 阶段**禁用或仅 toast「详情稍后」**，完整打开留待 US6；确认「+」仍只建标准卡
- [X] T019 [US1] 按 quickstart V2(1–2)、V6(1–2) 手工验证组合与加入；确认非全部视图无组合入口；操作后约 1 秒内列表刷新可见

**Checkpoint**: MVP 可演示：全部视图组合/加入可用，listAll 折叠正确。

---

## Phase 4: User Story 2 — 合并父卡片并移出子卡片（Priority: P1）

**Goal**: 父并父；详情或专用 API 移出子卡；父拖标准无效。

**Independent Test**: quickstart V2 步骤 3～4；父→标准禁止。

- [X] T020 [US2] 在 `backend/src/services/schedule.service.ts` 实现 `mergeParents(targetId, sourceId)`：子改挂、硬删源父、recompute 目标
- [X] T021 [US2] 在 `backend/src/services/schedule.service.ts` 实现 `detachChild(cardId)`：清 `parentId`、不写 `lastParentTitle`、recompute/可能清零硬删
- [X] T022 [US2] 在 `backend/src/routes/cards.ts` 注册 `POST /api/cards/:parentId/merge` 与 `POST /api/cards/:cardId/detach`
- [X] T023 [P] [US2] 在 `frontend/src/lib/api.ts` 与 `frontend/src/hooks/useCardMutations.ts` 增加 merge/detach 客户端与 mutation
- [X] T024 [US2] 扩展 `frontend/src/components/ScheduleViews/CardGrid.tsx`：父→父 drop 调用 merge；父→标准显示禁止态且不发请求
- [X] T025 [US2] 按 quickstart V2(3–4)、V6(3–4) 验证合并、移出 API（UI 拖出详情可暂用 API/curl，完整拖出在 US6）；操作后约 1 秒内可见刷新

**Checkpoint**: 合并与移出后端完备；全部视图三条组合路径 + 禁止态齐备。

---

## Phase 5: User Story 3 — 管理父卡片时间与已/未安排状态（Priority: P1）

**Goal**: 包络默认、可更宽不可更窄、手调保留、突破扩展；全未安排则父时空；子属性不被父改变。

**Independent Test**: quickstart V3 全节。

- [X] T026 [US3] 扩展 `backend/src/services/schedule.service.ts` 的 `update`：父卡仅允许 title/startAt/endAt；校验包络不等式；成功设 `timeManual=true`；拒绝改 importance/category/stage 等为 400
- [X] T027 [US3] 确保子卡 `update` 修改时间后若存在 `parentId` 则调用 `recomputeParentTime`；compose/add/merge/detach 路径已触发 recompute（复查补洞）
- [X] T028 [US3] 确认未安排父卡（起止皆空）仅出现在 `view=all` 未安排语义中，且 week/month `cardInRange` 排除之
- [X] T029 [US3] 按 quickstart V3 用 curl/API 验证包络、手调、突破扩展、更窄 400、全未安排

**Checkpoint**: 父卡时间策略完全由后端保证，可独立于详情 UI 验收。

---

## Phase 6: User Story 4 — 在各视图按规则看到父卡片或子卡片（Priority: P1）

**Goal**: 全部/周/月显父隐子；日显子隐父；垃圾箱 UI 可展示标注位；坐标图不画父卡。

**Independent Test**: quickstart V4 中 all/week/month/day/坐标图可见性。**不含**：点开父详情完整编辑（→ US6 / T043）、trash 父名标注有数据时的复验（→ US5 / T039）。

- [X] T030 [P] [US4] 复查/微调 `frontend/src/components/calendar/allSections.ts` 与 `AllView.tsx`：父卡按自身起止入已安排/未安排段
- [X] T031 [P] [US4] 调整 `frontend/src/components/ScheduleViews/WeekView.tsx`、`MonthView.tsx`、`calendar/SpanBar.tsx`：渲染父卡时段；点击父卡与 AllView 一致先禁用或占位，完整详情接线在 US6（T042）
- [X] T032 [US4] 调整 `frontend/src/components/ScheduleViews/DayView.tsx`：列表含有 `parentId` 的子卡；`buildDaySections` 不读 parentId；折页点击回调预留，与 US6/US7 接线
- [X] T033 [P] [US4] 调整 `frontend/src/components/ScheduleViews/TrashView.tsx`：有 `lastParentTitle` 则展示「原属：…」，无则静默；**完整有数据验收依赖 US5（T039）**
- [X] T034 [US4] 调整 `frontend/src/components/ScheduleViews/QuadrantView.tsx`：输入过滤 `kind !== "parent"`；成员子卡仍按其重/急度定位
- [X] T035 [US4] 按 quickstart V4 核对 all/week/month/day/坐标图可见性；**明确跳过** trash 父名与「点开详情」完整路径（分别记入 T039、T043）

**Checkpoint**: 概览折叠与日视图摊开、坐标图排除父卡符合规格；详情与 trash 标注不在本 checkpoint 强收。

---

## Phase 7: User Story 5 — 父卡片随子卡清空而消失，并正确恢复归属（Priority: P2）

**Goal**: 父无删除/完成；清零硬删；restore 归回/重建；撞名递增 `_`。

**Independent Test**: quickstart V5。

- [X] T036 [US5] 扩展 `backend/src/services/schedule.service.ts` 的 `complete`/`delete`：拒绝对父卡操作；标准卡若有父则写 `lastParentTitle`、清 `parentId`、再软删；事务末 recompute/清零硬删
- [X] T037 [US5] 扩展 `restore`：仅标准卡；标题冲突自动加 `_` 前缀直至唯一；按 `lastParentTitle` 归入现存父或新建父后再归入；清空快照并 recompute
- [X] T038 [US5] 在 `backend/src/routes/cards.ts` 确保 complete/delete/restore 错误码与契约一致；前端既有按钮对父卡不展示（详情在 US6 落实）
- [X] T039 [US5] 按 quickstart V5 验证剩一仍在、清零 404、归回、重建、下划线消解；复验 TrashView 父名标注

**Checkpoint**: 生命周期与垃圾箱语义与软删自洽。

---

## Phase 8: User Story 6 — 打开并编辑父卡片详情（Priority: P2）

**Goal**: 全部点父卡与日视图点折页打开同一详情；改名/时间就地校验；迷你网格拖出=移出。

**Independent Test**: quickstart V7。

- [X] T040 [US6] 新建 `frontend/src/components/cards/ParentCardDetailModal.tsx`：上区名称/时间就地编辑（红字校验）；无完成/删除/优先级/分类/阶段；下区迷你子卡网格按 `createdAt` 排列
- [X] T041 [US6] 在 `ParentCardDetailModal.tsx` 实现拖出下区边界调用 detach；边界高亮释放区
- [X] T042 [US6] 在 `frontend/src/layouts/AppShell.tsx`（或现有 modal 编排处）挂载父详情状态；AllView/Week/Month 点父卡、DayView 折页均打开同一 modal
- [X] T043 [US6] 接线父卡 PATCH（update mutation）与 GET `:id` 拉 children；按 quickstart V7 验证双入口、校验、拖出移出

**Checkpoint**: 父卡管理集中入口可用。

---

## Phase 9: User Story 7 — 识别父卡片与拖拽反馈（Priority: P3）

**Goal**: 堆叠影/徽章打磨、折页角标层级、拖拽四阶段反馈、reduced-motion、明暗对比。

**Independent Test**: quickstart V6 全节 + 明暗/reduced-motion。

- [X] T044 [P] [US7] 在 `frontend/src/index.css` 补充父卡堆叠影（明/暗）、计数徽章、折页角标 token；确保深色对比可读
- [X] T045 [US7] 完善 `CardGrid.tsx` 父卡视觉与四阶段拖拽反馈（浮动、高亮、计数+1 预览、禁止态、fly-to、toast）；`prefers-reduced-motion` 下降级
- [X] T046 [US7] 在日视图卡片右下角实现可点击折页角标，`z-index` 低于完成框；hover 显示 `parentTitle`
- [X] T047 [US7] 确认 `frontend/src/components/TopBar/TopBar.tsx` 垃圾箱 drop 未改；与 CardGrid 组合 drop 靠落点共存；按 quickstart V6 全路径验收

**Checkpoint**: 视觉与动效达标且不破坏删除手势。

---

## Phase 10: Polish & Cross-Cutting

**Purpose**: 全量验证与回归。

- [X] T048 运行 [quickstart.md](./quickstart.md) V0～V9 全场景并记录结果
- [X] T049 [P] 执行 `npm run build`，修复类型/编译错误
- [X] T050 抽查 001～007 核心路径（登录、标准 CRUD、日周月全部、完成删除恢复、坐标图、分类阶段日报、拖到垃圾箱）确认无损
- [X] T051 [P] 明暗主题 + 窄屏下父卡/折页/详情可用性目视检查

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → **Phase 2 Foundational**（阻塞全部故事）
- **US1 (P1 MVP)** → 依赖 Foundational
- **US2** → 依赖 US1 的 compose/addChild 与 CardGrid drop 骨架（可复用同一文件继续改）
- **US3** → 依赖 Foundational 的 `recomputeParentTime`；可与 US2 后半并行（不同关注点）
- **US4** → 依赖 Foundational `listAll`；前端可与 US2/US3 并行
- **US5** → 依赖 Foundational 清零原语；建议在 US2 detach 之后
- **US6** → 依赖 US2 detach API + US3 父卡 PATCH
- **US7** → 可在 US1 CardGrid 之后抛光；折页依赖 US4/US6 接线
- **Polish** → 依赖计划交付的全部故事

### User Story Dependencies

```text
Foundational
    ├── US1 (compose + addChild + AllView drop)  ← MVP
    │     └── US2 (merge + detach + 禁止态)
    │           └── US6 (详情拖出)
    ├── US3 (时间 PATCH / 触发复查)
    ├── US4 (各视图呈现)
    │     └── US7 (折页视觉)
    └── US5 (complete/delete/restore)
Polish
```

### Parallel Opportunities

- T004 / T005 可并行（前后端类型）
- T014 / T015 可并行于 T011～T013 之后的客户端层
- T030 / T031 / T033 / T034 可并行（不同视图文件）
- T044 可与 T040 并行（CSS vs 新组件）
- T049 / T051 可在 T048 期间穿插

### Parallel Example: After Foundational

```bash
# 开发者 A：US1 后端 compose
Task: T011 compose in schedule.service.ts
Task: T013 routes compose/children

# 开发者 B：US1 前端类型与 mutation（待 T005 完成后）
Task: T014 api.ts composeParent
Task: T015 useCardMutations compose
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. Phase 1 + Phase 2  
2. Phase 3 US1（compose + addChild + AllView drop + 父卡基础外观）  
3. **STOP**：按 quickstart V2(1–2)、V6(1–2)、V4(all) 验收  
4. 再增量 US2→US7→Polish  

### Incremental Delivery

1. US1：组合可用  
2. US2：合并/移出  
3. US3：时间约束坚固  
4. US4：多视图一致  
5. US5：清零与恢复  
6. US6：详情管理  
7. US7：视觉动效  
8. Polish：全量回归  

---

## Notes

- 不新建测试框架任务；验证以 quickstart 手工/curl 为准  
- 父卡 `categoryId` 固定 `system-none`，勿放宽 NOT NULL  
- 组合 MIME 保持 `application/x-watson-card`；勿改 TopBar 删除语义  
- 提交建议按 Phase 或故事边界切分  
- 格式校验：全部任务均为 `- [ ] Txxx ...` 且含文件路径；故事阶段含 `[USn]`  

---

## Phase 11: Convergence

**Purpose**: Close gaps found by `/speckit-converge` against FR-012/020/021 after the initial implement pass.

- [X] T052 Fix AllView coordinate chart to include active standard member cards (with parentId), excluding parents, in `frontend/src/components/ScheduleViews/AllView.tsx` (and API fetch as needed) per FR-012 / US4/AC5 (partial)
- [X] T053 Add parent stack shadow and childCount badge to week/month parent rendering in `frontend/src/components/calendar/SpanBar.tsx` and `frontend/src/components/ScheduleViews/WeekView.tsx` / `MonthView.tsx` per FR-020 / US7/AC1 (partial)
- [X] T054 Defer compose fly-to animation until after successful `composeParent` (not on pre-confirm drop) in `frontend/src/components/ScheduleViews/CardGrid.tsx` and `frontend/src/components/cards/CreateParentModal.tsx` per FR-021 (partial)
- [X] T055 Animate the dragged source card (or ghost) collapsing toward the drop target on successful compose/add/merge in `frontend/src/components/ScheduleViews/CardGrid.tsx`, respecting `prefers-reduced-motion`, per FR-021 (partial)
