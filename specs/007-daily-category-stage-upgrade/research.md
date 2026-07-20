# Phase 0 Research: 日报、分类管理、日程阶段与体验升级

**Feature**: `007-daily-category-stage-upgrade`  
**Date**: 2026-07-20

## R1 — 数据库迁移拆分与顺序

**Decision**: 使用三条顺序 migration：

1. `0006_daily_reports.sql`：创建 `daily_reports`
2. `0007_schedule_stage.sql`：为 `schedule_cards` 添加 stage
3. `0008_none_category.sql`：系统化已有「无」分类；仅不存在时插入默认系统 ID

全部 migration 完成、随后 `seedDatabase()` 确认「无」存在后，应用才注册并提供分类删除能力。

**Rationale**:
- 三个数据变化相互独立，拆分后升级失败时容易定位和恢复。
- 日报建表对旧模型零侵入，可最先执行。
- stage 使用 `NOT NULL DEFAULT 'not_started'`，SQLite 会为历史行提供兼容值，无需独立回填脚本。
- 「无」是删除事务的前置条件；应用启动先执行全部 migration 与 seed，路由随后注册，因此放在第三条不会暴露缺失窗口。
- 既有版本已允许用户创建分类，因此 migration 必须兼容升级前已有 `name_lower='无'` 的记录：保留其主键和卡片引用，只把它标记为系统分类。

**Alternatives considered**:
- 单一 migration：文件更少，但无法独立验证三种风险，拒绝。
- 先插入「无」再改 stage：同样可行，但不改变应用启动原子边界；采用用户提供的既定顺序。
- 重建 `schedule_cards` 表：新增一列不需要破坏性重建，风险更高，拒绝。

## R2 — 日报数据形状与日期标识

**Decision**: `daily_reports` 使用 `date TEXT PRIMARY KEY` 保存 `YYYY-MM-DD` 日历日期，三栏为非空文本默认空串，并包含 ISO 8601 的 `created_at`、`updated_at`。不建立到 `schedule_cards` 的外键。

**Rationale**:
- 产品语义是“每个日历日最多一份”，日期本身就是稳定自然键。
- 日期必须与日视图锚定日一致，不应转换成 UTC 时刻后再推导，以免跨时区错日。
- 空串简化空栏与部分编辑的展示，不需要 nullable 分支。
- 独立表确保卡片完成、删除或永久删除不影响日报。

**Alternatives considered**:
- UUID 主键 + date 唯一索引：增加无业务价值的标识，拒绝。
- 把日报字段加入卡片：日报不是日程，违反领域边界，拒绝。
- 用 UTC timestamp 作为日期键：存在时区换日歧义，拒绝。

## R3 — 日报读取与保存契约

**Decision**:
- `GET /api/daily-reports/:date` 返回 `{ item: DailyReport | null }`；不存在是正常空状态，不返回 404。
- `PUT /api/daily-reports/:date` 接收完整 `goal/result/analysis` 快照并执行 upsert，成功返回完整 DTO。
- 前端对同一日期的失焦保存串行化；mutation 捕获触发时的 date，不允许旧日期响应覆盖新日期草稿。

**Rationale**:
- `item: null` 明确区分“尚未保存”与“已保存三栏空串”，同时避免把空日报当错误。
- 完整 PUT 符合资源替换语义；组件本地持有三栏完整草稿。
- 串行队列与日期快照可处理连续失焦和快速切日，不需要扩大接口引入版本锁。

**Alternatives considered**:
- GET 404：要求前端把正常空状态当异常处理，拒绝。
- 每栏 PATCH：可减少负载，但增加接口与竞态组合，当前三段文本体量很小，拒绝。
- 乐观并发版本号：单用户场景收益不足；更新时间保留供未来扩展，暂不采用。

## R4 — Markdown 渲染安全

**Decision**: 前端新增 `react-markdown`，不配置 `rehype-raw`，不执行日报中的原始 HTML。编辑态始终使用纯文本 textarea。

**Rationale**:
- 直接渲染 Markdown 可满足标题、列表、链接等需求。
- `react-markdown` 默认不把原始 HTML 当可执行 DOM，降低持久化脚本注入风险。
- 与 React 组件树集成，不需要手写 HTML 清洗器。

**Alternatives considered**:
- `dangerouslySetInnerHTML` + Markdown 转换：需要额外严格清洗，风险高，拒绝。
- 自研 Markdown 子集：边界和安全维护成本高，拒绝。
- 富文本编辑器：超出纯文本编辑范围，拒绝。

## R5 — 「无」分类与删除事务

**Decision**:
- 「无」由 migration + seed 按 `nameLower` 幂等保证存在；已有「无」保留原主键，仅全新插入时使用默认系统 ID。
- 现有 seed 拆分为“首次初始化分类”和“永久系统分类”：owner preferences 尚不存在的全新数据库可创建「工作 / 个人 / 健康」，后续启动只永久保证「无」，避免复活用户删除的分类。
- 只有「无」不可删除；其他分类包括「个人」均可删除。
- 删除事务按“读取目标 → 拒绝无/不存在 → 获取无 → 更新所有引用该分类的卡片 → 删除目标”执行。
- 更新覆盖 active、completed、deleted 全生命周期卡片，避免外键引用阻止删除或归档卡片成为孤儿。

**Rationale**:
- 系统兜底分类是引用完整性的最后目标，必须始终存在。
- 事务确保卡片改指与分类删除全成或全败。
- 垃圾箱卡片仍可能恢复，必须保持有效分类引用。

**Alternatives considered**:
- 仅迁移活跃卡片：归档卡片仍持有外键，删除可能失败，拒绝。
- `ON DELETE SET NULL`：现有 `category_id NOT NULL` 且产品要求归「无」，拒绝。
- 禁止删除全部 preset：规格只保护「无」，会额外限制所有者，拒绝。

## R6 — 默认分类与既有空分类

**Decision**:
- 新卡片默认分类 resolver：查找「个人」；存在则使用，否则使用「无」。
- 删除「个人」后不由 seed 或建卡路径自动重建。
- 当前 schema 的 `category_id` 自初始版本起为 `NOT NULL`；不修改其可空性，也不执行批量“空分类归无”迁移。

**Rationale**:
- 满足用户最新决定：允许删除「个人」，删除后默认「无」。
- 当前合法数据库不存在 null `category_id`，为假设中的 legacy null 改 schema 会制造新的无效状态。
- seed 只幂等保证真正系统不变量「无」；不应复活用户主动删除的其他分类。

**Alternatives considered**:
- 继续 `findOrCreate("个人")`：会让被删除分类在下次建卡时复活，拒绝。
- 删除「个人」后阻止建卡：不符合仅标题必填，拒绝。
- 将 category_id 改 nullable：扩大状态空间且无现存数据需求，拒绝。

## R7 — Stage 存储、校验与筛选

**Decision**:
- 存储值为 `not_started | in_progress | wrapping_up`，数据库列非空默认 `not_started`。
- 后端 DTO、创建和 patch 输入使用同一联合类型；非法值返回 400。
- 只有 `GET /api/cards?view=all&stage=...` 应用 stage 过滤；stage 与其他筛选按 AND 组合。
- 修改 stage 只更新 stage 与 `updatedAt`，不触发时间解析或生命周期变化。

**Rationale**:
- 稳定英文值与中文展示解耦，避免后续文案调整迁移数据。
- DB 默认值同时覆盖历史卡与新卡。
- 服务层校验防止绕过前端产生非法持久状态。
- 规格明确筛选器仅属于“全部”视图。

**Alternatives considered**:
- 中文直接入库：文案与数据耦合，拒绝。
- 允许 null 表示未开始：历史/新卡语义不一致，拒绝。
- 所有视图支持 stage query：超出澄清后的范围，拒绝。

## R8 — 日视图分区与时区边界

**Decision**:
- 后端继续用既有 `view=day&date=` 返回与锚定日相交的已安排活跃卡片。
- 前端基于 owner timezone 把 start/end 转换为日历日期，再依次判断：
  1. end 落锚定日 → 今天截止
  2. start 早于锚定日且 end 晚于锚定日 → 正在进行
  3. start 落锚定日 → 今天开始
- 采用 `[dayStart, nextDayStart)` 半开区间；函数输出三个互斥数组。

**Rationale**:
- 结束优先自然处理同日开始结束卡片，保证不重复。
- 沿用现有后端筛选避免新增第四条后端改动面。
- 使用 owner timezone 与日/周/月导航一致。

**Alternatives considered**:
- 后端直接返回三个分组：增加接口职责并重复前端展示语义，拒绝。
- 按浏览器本地时区：可能与所有者偏好和现有日历视图不一致，拒绝。
- 三次 filter 无优先级：同日始终卡片会重复，拒绝。

## R9 — 日视图独立滚动布局

**Decision**: 建立完整的 `min-h-0` 高度传递链；DayView body 为横向 flex，左列为纵向 flex，只有左上 card sections 使用 `flex-1 min-h-0 overflow-auto`，日报 `shrink-0`，右侧坐标图独立。

**Rationale**:
- flex 子项默认 `min-height:auto` 会把父容器撑高，必须逐层 `min-h-0` 才能把溢出限制在指定区域。
- 唯一滚动容器可以保证日报与坐标图不被卡片列表推动。
- 顶/底渐隐 overlay 绑定该滚动容器，状态准确且不遮挡其他区域。

**Alternatives considered**:
- 整个 DayView `overflow-auto`：会推走日报和坐标图，拒绝。
- 固定像素高度：响应式和不同视口不可用，拒绝。
- 三个章节各自滚动：增加多个滚动上下文，违背“上部区段内部”整体浏览，拒绝。

## R10 — PriorityPicker 与卡片视觉层

**Decision**:
- PriorityPicker 改为原生 range 语义的横向控件，`min=0 max=10 step=1`，通过 CSS 渐变与跟随气泡增强；键盘、触摸和指针共享输入语义。
- 只读 PriorityMeter、后端 priority clamp 和坐标图数值不变。
- 单卡视觉层固定为：过期底色最底层、分类色带左缘、hover 条顶边、stage 角标、checkbox 独立操作区。

**Rationale**:
- 原生 range 提供整数吸附、键盘和触摸基础可访问性，减少自研拖动错误。
- 仅替换编辑输入，不改变持久值和坐标逻辑，影响面可控。
- 预先分配视觉区域可避免多标识遮挡和点击冲突。

**Alternatives considered**:
- 保留旧弹出数字列并新增色条：违反“替换而非并存”，拒绝。
- 完全自研 pointer drag：需要重复实现键盘、触摸和边界行为，拒绝。
- 所有标识都放右上角：必然与 checkbox/垃圾箱 chrome 冲突，拒绝。

## R11 — 多设备刷新策略

**Decision**: 不扩展现有 `/api/sync` 协议。stage 自动包含在 cards DTO；页面前台可见时每 3 秒失效并重新读取当前活跃的 `cards`、`categories` 与 `daily-report` 查询；页面恢复可见时立即执行一次刷新。

**Rationale**:
- 分类删除若走增量 sync 需要 tombstone 或表级更新时间，明显扩大数据模型。
- TanStack Query 以 query-key 前缀失效时只重新请求活跃查询，可覆盖当前可见日报而无需把日期传入同步 hook。
- 3 秒前台轮询为两台同时可见设备提供明确上界，满足宪法“即时反映”；visibility 事件负责后台恢复后的立即追平。
- 保持后端改动集中在三条既定纵切。

**Alternatives considered**:
- 给 sync 增加日报与 deletedCategoryIds：需要新删除记录模型，超出范围，拒绝。
- 只在 visibility change 刷新：两台设备持续前台可见时不会同步，违反宪法 V，拒绝。
- 轮询所有历史日报：无必要负载；采用只 refetch 活跃 query，拒绝全量读取。

## R12 — 验证策略

**Decision**: 本轮规划不顺带引入测试框架。必达验证为 TypeScript 前后端 build、空库/旧库 migration smoke、登录与未登录 API 验证、007 quickstart 和 001～006 回归。日期分区纯函数是后续引入自动化时的首个候选。

**Rationale**:
- 当前根、前端、后端 package 均无 test script，全仓库无测试文件。
- 在大功能迭代中同时引入测试框架会扩大任务与依赖面。
- 迁移、接口和关键 UX 仍通过可重复 quickstart 明确定义验收步骤。

**Alternatives considered**:
- 同轮引入 Vitest/Playwright：长期有价值，但不属于本轮产品需求，留作独立改进。
- 只运行 build：无法证明数据迁移和交互行为，拒绝。
