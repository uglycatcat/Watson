# UI Components: 004 契约

**Feature**: `004-priority-trash-coordinate`  
**Date**: 2026-07-15

---

## TopBar

| 控件 | 行为 |
|------|------|
| 垃圾箱图标 | 原登出位置；切换主视图到 TrashView（或等价路由 state） |
| 登出 | **移除** |
| 主题 | 文案仅为「浅色」或「深色」；点击切换 |
| AI | 文案固定「AI」；隐藏=白底（深色主题对应浅控件）；显示=蓝底/强调色 |
| 搜索 | 候选合并 active+trash；箱条目标注「已完成」「已删除」；点开只读详情 |

---

## PriorityPicker

- 点击重要度/紧急度触发
- 竖向列出 0..10（**下 0 上 10**）
- 用于 CreateCardModal、CardDetailModal（活跃）、CardFormFields

---

## CompleteCheckbox

- 详情右上角；DayView / AllView 卡片右侧
- 点击 → `complete` API → invalidate；无确认框
- Week/Month 卡片面不提供（详情仍可完成）

---

## CardDetailModal

### 活跃

- 打开即可编；无独立「编辑」模式
- 右下角：**重置**（dirty 才启用，回 snapshot，不关闭）+ **确认**（PATCH 保存关闭）；勿与垃圾箱「恢复」混用
- 点遮罩：丢弃关闭
- 校验失败：就地红字，不关
- 删除文案「删除」；ConfirmDialog **收窄**
- 底部小号浅色：`创建时间：YYYY-MMDD-HHmm` 与最后修改时间（格式与 spec 示例一致）
- 右上 CompleteCheckbox

### 箱内只读

- 字段不可改；无确认保存；无完成方框
- 可展示状态标记与时间戳
- 关闭同遮罩

---

## CreateCardModal

- **恢复确认按钮**；Enter（标题非空）与确认等价
- 无 timeNature；start/end 可选；PriorityPicker

---

## TrashView

- 布局仿 AllView 网格
- 排序：trashedAt 新→旧，左上最新
- 角标：completed 对勾；deleted 红圆
- 每卡：恢复、永久删除（ConfirmDialog）
- 点击卡片 → 只读详情

---

## QuadrantView

- 由 DayView / AllView「坐标视图」按钮打开，居中 overlay
- SVG 十字轴，原点 (5,5)；X 紧急右增；Y 重要上增
- 分桶 `(urgency,importance)`；圆半径随 count 增、有上限
- hover tooltip 列任务名（可滚动看全；或前若干条 +「+N」）
- **click：无额外行为**
- 关闭：点外围或显式关闭控件 → 回原视图
- 数据仅 active；不显示箱内卡

---

## DayView / AllView

- 卡片按 `createdAt` DESC 行优先（左新右旧、下行更旧）
- grid：降低 minmax 下限，列数更早随宽变化
- 卡片右侧 CompleteCheckbox
- 坐标视图入口

---

## WeekView / MonthView

- 统一容器 padding，左侧不越界
- 修复同格竖向拥挤
- 跨天已安排：月=单格略宽、不跨格连接；周=保留 SpanBar

---

## AllView 筛选

- `scheduled` 替代时间性质 / 有无时间
- importance / urgency：0..10
- 保留 category 等

---

## ChatPanel / AppShell

- 默认关闭 AI 侧栏（`chatOpen` 初始 false）
