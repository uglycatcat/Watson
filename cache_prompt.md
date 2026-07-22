## N1 · 每日报告保存的两个 bug

改动范围：`backend/src/routes/daily-reports.ts`（后端）、`frontend/src/components/daily-report/DailyReportPanel.tsx`（前端）。不碰其它文件、不碰数据库。

**Bug ① 后端 zod 拒绝部分字段更新**
- 根因：`backend/src/routes/daily-reports.ts` 里的 `snapshotSchema` 是 `.strict()` 且 `goal`/`result`/`analysis` 三个字段都是必填的 `z.string()`，所以只提交 `{ goal: "xxx" }` 会整体 400。
- 要求：把这三个字段都改成**可选**（`z.string().optional()`），保留 `.strict()`（仍拒绝未知字段）。这样允许只更新单个字段。
- 落到 service：`dailyReportService.upsert(date, parsed.data)` 现在期望三字段齐全。改成**部分更新语义**——只把传入的字段写入，未传入的字段保留库中原值（不存在则用空串默认）。请 read `backend/src/services/daily-report.service.ts` 的 `upsert` 后按此调整（用 `COALESCE`/先读后合并均可，保持 date 主键 upsert）。
- 验证：`curl -X PUT .../api/daily-reports/2026-07-22 -d '{"goal":"only goal"}'` 返回 200 且只改 goal；再单发 `{"result":"..."}` 不清空 goal。

**Bug ② 前端 save() 读到旧 draft（stale closure）**
- 根因：`DailyReportPanel.tsx` 的 `save()` 里 `const snapshot = { ...draft }` 捕获的是**该次 render 闭包中的 draft**。textarea onBlur 紧跟最后一次 onChange 时，save 可能拿到上一次 render 的旧 draft，发出去是旧数据。
- 要求：新增一个 `draftRef = useRef(draft)`，在 `setDraft` 的地方（或一个 `useEffect(() => { draftRef.current = draft }, [draft])`）同步最新值；`save()` 内改成 `const snapshot = { ...draftRef.current }`，不要再从闭包 `draft` 取。`saved` 比对同样用 `draftRef.current`。
- 保持现有的 `queueRef` 串行队列、`dateRef` 防串日期、乐观 `setQueryData` 逻辑不变。
- 验证：某字段快速输入后立刻点别处失焦，网络面板里 PUT 的 body 是**最新**输入值，不是上一次的。

## N2 · 父卡详情里的子卡：换标准卡样式 + 可点击打开详情

改动范围：`frontend/src/components/cards/ParentCardDetailModal.tsx`、`frontend/src/layouts/AppShell.tsx`（接线）。可能新增少量 CSS 到 `frontend/src/index.css`。

现状：`ParentCardDetailModal.tsx:244-279` 里子卡是自造的 `parent-child-mini schedule-card` 小 div，只有 `draggable`（拖出=移出）、**没有 onClick**，且是迷你样式（只显示标题两行）。

要求：
1. **子卡改用标准卡片外观**——视觉与 `CardGrid.tsx` 的标准卡分支一致：
   - 分类左边色带 4px（`borderLeftWidth:4px` + `getCategoryAccent(child.categoryColor)`，import 自 `../../lib/categoryColor`）；
   - 显示：标题（`line-clamp-2`）、时间副标题（复用 CardGrid 里 `cardSubtitle` 的「起–止 / 未安排」+ ` · 分类名` 规则，可把该函数抽到共用文件或在本组件内同样实现）、重要/紧急两条 `PriorityMeter`（`import { PriorityMeter } from "../cards/PriorityMeter"`，`compact`）、`StageBadge`（`import { StageBadge } from "../cards/StageBadge"`，`compact`）；
   - 卡壳沿用 `background:var(--panel)`、`border:1px solid var(--border)`、`borderRadius:var(--radius-lg)`、`boxShadow:var(--shadow-sm)`、`padding:var(--space-3)`、`min-h-[88px]`。
   - 去掉 `parent-child-mini` 迷你类和 `text-xs px-2 py-1.5` 迷你尺寸；下区网格列宽从 `120px` 提到与主网格一致的 `minmax(min(100%,180px),1fr)`。
   - **不显示完成勾选框**（详情内不做完成操作），也不显示折页角标（此处语境已明确是子卡）。
2. **子卡可点击打开该子卡的标准卡详情**：
   - 交互链路：看到父卡 → 打开父卡详情 → 看到子卡 → 点击子卡 → **关闭父卡详情，打开该子卡的 `CardDetailModal`**。
   - 接线：`ParentCardDetailModal` 新增一个 `onOpenChild?: (child: ScheduleCard) => void` prop；子卡 div 加 `onClick` 调用它（`role="button"` + `tabIndex=0` + Enter/Space 键盘可达）。在 `AppShell.tsx` 里传入 `onOpenChild={(child) => { setSelectedParentId(null); setSelectedCard(child); }}`，复用已有的 `CardDetailModal`。
   - **点击与拖动共存**：保留现有 `draggable` + `onDragStart/onDrag/onDragEnd`（拖出下方区域=移出）。只有真正拖动才触发 dragstart，单纯 click 打开详情，二者不冲突；确保 `onClick` 里不 `preventDefault` 拖拽。
3. **移出交互保持不变**：仍是「把子卡拖出下方 `parent-children-zone` 区域即移出」，边界高亮 `is-detach-target` 与底部提示文案保留。
- 验证：父详情里子卡长得跟主视图标准卡一样（色带/双优先级条/阶段徽章齐全）；点子卡→父详情关、子卡详情开；从区域里把子卡拖出去仍能移出。

## N3 · 父卡尺寸比标准卡还小

改动范围：`frontend/src/components/ScheduleViews/CardGrid.tsx` 的父卡渲染分支、`frontend/src/index.css` 的 `.parent-card-stack` 相关。不碰后端。

根因：父卡与标准卡共用 `min-h-[88px]`，但父卡分支**不渲染重要/紧急两条、StageBadge、完成框**，正文只剩标题+时间两行，加上父卡 `borderLeftWidth:1px`（标准卡 4px），整体显得比标准卡矮小、单薄；且堆叠影 `::before/::after`（offset 3px×2）会被 grid `gap` 裁掉，「一叠」的实体感出不来。

要求（父卡体量 ≥ 标准卡）：
1. 父卡分支 `min-height` 提到 **`104px`**（比标准卡 88px 略高），保证「一叠卡片」的视觉分量不小于单卡；标准卡 `min-h-[88px]` 不变。
2. 让**堆叠影露出来**：`.parent-card-stack` 给右侧、底部各留出约 `6px`（= `--parent-stack-offset` × 2）呼吸位——在 `index.css` 给 `.parent-card-stack` 加 `margin-right`/`margin-bottom` 或让其父容器 padding 容纳伪元素位移，使 `::before/::after` 两层叠纸边不被相邻卡片或 grid gap 裁切。明暗两主题都要能看到清晰的 1–2 层叠边。
3. 计数徽章（`.parent-child-badge`）、名称、时间（无时间显「未安排」）保留。父卡仍**不渲染**标准卡专有的优先级条/分类色带/阶段徽章/完成框（这是父卡的刻意简洁）。
4. 可选微调：父卡标题字号比标准卡略大或加 `font-semibold` 强化「容器」感——但不引入新色板、不加新元素。
- 验证：全部/周/月视图里父卡明显不小于标准卡、能看见堆叠叠边和右上计数徽章；明暗双主题各看一遍。