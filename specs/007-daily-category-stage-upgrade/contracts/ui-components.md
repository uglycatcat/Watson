# UI Component Contract: Watson 007

**Feature**: `007-daily-category-stage-upgrade`  
**Applies to**: React frontend

## 1. DayView

### Responsibilities

- 查询锚定日期的 active、scheduled、date-overlap 卡片。
- 读取 owner timezone，并把卡片互斥分入三个章节。
- 挂载对应日期的 DailyReportPanel。
- 保留右侧 embedded QuadrantView，输入卡片集合与本轮前一致。

### Layout contract

```text
DayView
├── Header: title + ViewTimeNav
└── Body
    ├── LeftColumn
    │   ├── DayCardSections    # 唯一 overflow-auto
    │   └── DailyReportPanel   # 不随卡片滚动
    └── QuadrantView           # 不随卡片滚动
```

- 从视图路由到 DayCardSections 的每一层 flex child 必须允许 `min-height: 0`。
- DayCardSections 是唯一卡片滚动容器。
- 桌面保持右侧坐标图；窄屏可重排，但三类内容都必须可达。
- 上/下渐隐提示只覆盖滚动容器边缘，`pointer-events: none`，到达相应边界后隐藏。
- ViewTimeNav 上浮区域必须 `overflow: visible` 或提供足够安全空间。

### Day section contract

```typescript
interface DaySections {
  dueToday: ScheduleCard[];
  inProgress: ScheduleCard[];
  startingToday: ScheduleCard[];
}
```

- 固定显示顺序：今天截止、正在进行、今天开始。
- 每张输入卡只出现一次。
- 同日始终卡归“今天截止”。
- 空章节保留章节语义，不得导致其他章节被误判为空。
- 全部三章为空时使用日视图 EmptyState；日报仍可编辑。

## 2. DailyReportPanel

### Inputs

```typescript
interface DailyReportPanelProps {
  date: string;
}
```

### Rendering

- 桌面：Goal、Result、Analysis & Insight 一排三列。
- 窄屏：按相同顺序堆叠三行。
- 仅 DayView 挂载；其他视图不得引用。

### Query state

- query key：`["daily-report", date]`。
- loading：显示三栏轻量占位，不能误示已有空日报。
- absent：三栏空白且可点击编辑。
- error：保留已知草稿，并提供可见重试提示。

### Field interaction

每个 DailyReportField 支持：

```text
view --click--> edit --blur--> saving --> view
                                 \--> error + draft retained
```

- edit 使用纯文本 textarea。
- view 使用 ReactMarkdown；不启用原始 HTML。
- 当前编辑栏有轻微强调，其他栏不降级为不可读。
- 失焦时只有草稿发生变化才保存。
- PUT 发送该日期三栏完整快照。
- 同日期保存必须按触发顺序串行，最后一次成功快照为缓存结果。
- 保存闭包持有触发时 date；切换日期后不得写入新日期 query cache。

### Accessibility

- 每栏具有可读 label。
- 展示态可通过点击、Enter 或 Space 进入编辑。
- 保存状态和失败状态不能只靠颜色。
- reduced-motion 下焦点强调即时切换。

## 3. CategoryManagerInline

### Placement

- 位于 CardFormFields 的分类选择控件旁。
- 不新增独立管理页面。

### Actions

#### Create

- “新增”打开小型内联输入或轻量弹层。
- trim 后空名称不可提交。
- 409 同名显示明确错误，不关闭输入。
- 成功后刷新 categories，并可选中新分类。

#### Delete

- 对当前选中且 `deletable=true` 的分类提供删除操作。
- 删除前必须使用强化危险语义的 ConfirmDialog。
- 文案说明关联卡片将归入「无」，而不是被删除。
- “无”不展示删除入口或入口 disabled 且解释原因。
- 成功后刷新 categories + cards；当前表单 categoryId 改为「无」。

### Default category

- empty form 优先选择名称为「个人」的分类。
- 若不存在「个人」，选择「无」。
- 不选择 categories 数组首项作为隐式默认。

## 4. CardFormFields

### Values

```typescript
interface CardFormValues {
  title: string;
  startAt: string;
  endAt: string;
  importance: number;
  urgency: number;
  categoryId: string;
  stage: CardStage;
  description: string;
}
```

### Layout

1. 标题独占一行。
2. 不显示“时间（可选）”legend；开始时间、结束时间同排。
3. 重要程度、紧急程度同排。
4. 分类、日程阶段同排。
5. 描述独占一行并比既有 rows=2 更高。
6. Modal 外部尺寸不因重排增大。

窄屏允许双列退化为单列，但字段顺序不变。

### Mapping

- empty values：stage=`not_started`，默认分类按“个人存在，否则无”。
- card to values：保留 card.stage。
- form to input：包含 stage。
- equality：stage 必须参与未保存变更判断。
- readOnly：stage 以只读徽章/字段展示，PriorityMeter 保持既有展示。

## 5. PriorityField / PriorityPicker

### Editable contract

- 编辑态只显示横向色条，不再打开旧竖向数字列。
- 数值范围 0～10，step=1。
- 支持 pointer、touch、ArrowLeft/Right、Home、End。
- 拖动时气泡跟随 thumb 展示当前整数。
- 色条颜色由淡到浓；颜色不是唯一数值反馈。
- onChange 永远只产生 0～10 整数。

### Read-only contract

- 继续使用第六轮 PriorityMeter。
- 不渲染 disabled range 作为只读主展示。
- 坐标图仍直接使用 importance/urgency 数值，不依赖控件 DOM。

## 6. StageBadge

### Mapping

| Value | Label | Visual role |
|-------|-------|-------------|
| `not_started` | 未开始 | 中性/低强调 |
| `in_progress` | 正在处理 | 活跃强调 |
| `wrapping_up` | 等待收尾 | 收尾/提醒强调 |

- 必须包含文字，不得只靠颜色。
- 明暗主题分别提供可读前景、背景和边框 token。
- 常规卡片位于右上角标区域，但不得覆盖 CompleteCheckbox。
- 周/月 SpanBar 必须在不遮挡标题的区域显示紧凑 stage 文字标识；日期抽屉卡片同样显示 StageBadge。
- trash 卡片若有既有 chrome，需共享角标区域并避免重叠。

## 7. CardGrid visual layers

### Props extension

```typescript
interface CardGridProps {
  showStage?: boolean;
  showHoverBar?: boolean;
  highlightOverdue?: boolean;
  highlightedCardIds?: ReadonlySet<string>;
  onHoverCardChange?: (id: string | null) => void;
}
```

### Layer order

1. 卡片基础背景。
2. 仅 AllView 的低饱和过期红底。
3. 左缘分类色带。
4. 顶边 hover 装饰窄条。
5. 正文、PriorityMeter。
6. stage 角标。
7. CompleteCheckbox 与其他操作 chrome。

### Behavioral rules

- hover 顶条只在 DayView 和 AllView 启用。
- 顶条不承载点击、拖动或菜单事件。
- 过期条件由 AllView 提供，不让 CardGrid 在其他视图自行推断。
- checkbox 点击不得触发卡片详情。
- 拖拽行为与 WATSON_CARD_MIME 协议不变。
- CardGrid 与 SpanBar 在 dragstart 时必须提供可辨认来源卡片的 drag image/拖影。
- 坐标图联动只高亮明确对应的卡片集合。

## 8. AllView

### Filter state

新增：

```typescript
const [stage, setStage] =
  useState<"" | "not_started" | "in_progress" | "wrapping_up">("");
```

- stage 非空时加入 query params 与 query key。
- 与现有 category、importance、urgency、scheduled 同时生效。
- 日、周、月和 trash 不增加该选择器。

### Overdue

- 仅对 `status=active && startAt && endAt && endAt < now` 的卡片启用过期底色。
- “当前时刻”在渲染/合理刷新时重新计算；不写回卡片。
- 未安排卡片永不因创建较早而泛红。

## 9. QuadrantView linkage

- 聚合圆 hover 时使用 transform/视觉属性放大高亮，不改变坐标。
- 聚合圆持有其 card IDs，并把该集合传给左侧卡片高亮状态。
- DayView 可联动当前三个章节中的对应卡片。
- AllView overlay 与下层列表不可可靠同时可见时，只要求圆自身高亮。
- reduced-motion 下取消 scale transition，但保留静态高亮。

## 10. Motion and feedback

### Tokens

- fast: 150ms
- normal: 200ms
- slow: 250ms
- easing 复用全站统一 token

### Covered interactions

- SegmentedControl 使用容器内单一 indicator 在选项间平滑滑动，而不是仅让各按钮背景交叉淡入
- 卡片列表有限交错淡入
- 主题颜色过渡
- Modal/Drawer 进入和退出
- EmptyState 极轻呼吸
- 日报编辑强调
- 坐标圆 hover
- 垃圾箱 drag over 与成功接收

### Reduced motion

`prefers-reduced-motion: reduce` 时：
- 取消 stagger、呼吸、位移、缩放。
- Modal/Drawer 可即时切换或只保留极短 opacity。
- 状态必须通过静态颜色、边框、文字或图标继续可辨。

## 11. Defect-specific contracts

### ViewTimeNav

- hover `translateY` 后按钮整个边界仍在可见区域。
- 修复不得取消 hover 反馈。
- 日、周、月三个调用位置均验证。

### ConfirmDialog

- 删除/永久删除确认按钮使用危险语义。
- 取消按钮视觉次要但仍清晰可发现。
- Esc、取消点击、焦点行为保持既有语义。

### Trash drop

- CardGrid 与 SpanBar 的 drag preview 均可辨认来源卡片。
- 进入 drop target 时 TopBar 垃圾箱高亮。
- 成功后提供短促接收反馈。
- 删除调用时机、无二次确认和恢复语义不变。
