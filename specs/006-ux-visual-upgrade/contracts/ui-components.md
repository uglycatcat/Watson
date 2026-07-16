# UI Components: 006 契约

**Feature**: `006-ux-visual-upgrade`  
**Date**: 2026-07-16

---

## Design Tokens（`index.css`）

- 间距 `--space-1`…`8`（建议 4px 阶梯：4/8/12/16/20/24/32/40）
- 圆角 `--radius-sm/md/lg`
- 阴影 `--shadow-sm/md/lg`（明暗各一套）
- 字号 `--text-xs`…`2xl` + 字重 token
- 强调色 `--accent` / `--accent-hover` / `--accent-active` / `--accent-subtle`
- 动效 `--duration-fast` 150ms / `--duration-normal` 200ms / `--duration-slow` 250ms
- `prefers-reduced-motion: reduce` 全局缩短动画

---

## SegmentedControl（新建）

**路径**: `frontend/src/components/ui/SegmentedControl.tsx`

| Prop | 类型 | 说明 |
|------|------|------|
| `value` | `string` | 当前选中 id |
| `options` | `{ id, label }[]` | **仅** 日/周/月/全部（不含 trash） |
| `onChange` | `(id) => void` | 等同原 `onViewChange` 子集（常规四视图） |

- 容器：圆角背景槽 + 内边距 `--space-1`
- 选中：subtle 底 + accent 字色；未选中：透明 + `--fg`
- **不**改变 `ViewMode` 枚举；trash 仍由右侧独立按钮切换

---

## TopBar（改造）

三区布局：

```
[ Watson | Search | + ]  |  [ SegmentedControl(day|week|month|all) | AnchorDate ]  |  [ 🗑 | — | 主题 | AI ]
```

| 行为 | 006 要求 |
|------|----------|
| 搜索宽度 | 默认窄（~200px）；focus-within 可扩至 ~md |
| 视图切换 | `SegmentedControl` **仅** 日/周/月/全部；**不含**垃圾箱 |
| 日期 | 顶栏 `AnchorDateControl`；`ViewTimeNav` **留在** Day/Week/Month 视图内，不迁入 TopBar |
| 操作区分组 | 垃圾箱独立组；主题+AI 另一组；组间竖线或 `--space-4` |
| 垃圾箱 drop | dragover 激活态（accent-subtle + outline）；语义同 005 |
| 005 行为 | 日期不可清空、all 显示日期、trash 隐藏日期、回到今天 — **保持** |

---

## PriorityMeter（新建）

**路径**: `frontend/src/components/cards/PriorityMeter.tsx`

| Prop | 类型 |
|------|------|
| `label` | `"重要"` \| `"紧急"` |
| `value` | `0..10` |
| `showNumber` | `boolean` default true |
| `compact` | `boolean` optional |

- 强度条 + 梯度填色；数字 `tabular-nums` 辅助
- 用于 `CardGrid`、`CardList`、坐标 tooltip、`PriorityField` 按钮面

---

## CardGrid / CardList（改造）

- 左缘 `4px` 色带：`getCategoryAccent(categoryId)`
- 标题 `--text-sm` + `--font-semibold`；时间 `--text-xs` + `--muted`
- 优先级区：`PriorityMeter` ×2，**移除**「重要N 紧急N」纯文本主展示
- 卡片：`--shadow-sm` + `background: var(--panel)`；dark 下对比抬升
- 空数据：改由父 View 渲染 `EmptyState`（Grid 可保留 `emptyMessage` fallback）
- 拖拽/完成/点击：**行为不变**

---

## CompleteCheckbox（改造）

- 自定义边框圆角 checkbox；hover `border-color: var(--accent-hover)`
- 勾选：check 图标 + 150ms scale 动画（reduced-motion 下即时）
- 仍调用 `completeCard(id)`；`disabled`/`isCompleting` 逻辑不变

---

## QuadrantView（改造）

- 四象限 `rect` 背景 + 角标文案：立即做 / 计划做 / 授权做 / 减少做
- 轴：`紧急度`（横）、`重要度`（纵）；原点 (5,5) 可见标记
- 点 hover：卡片式 tooltip（标题 + PriorityMeter 缩略）
- `cards.length <= 1`：中央说明 overlay
- `variant`: `embedded` | `overlay` — 行为与 005 一致（日常驻 / 全部按钮）
- 点击点/空白：**无**新导航（004 约定）

---

## EmptyState（新建）

**路径**: `frontend/src/components/ui/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

接入：`DayView`、`WeekView`、`MonthView`、`AllView`、`TrashView`、搜索无结果。

---

## Skeleton（新建）

**路径**: `frontend/src/components/ui/Skeleton.tsx`

- `Skeleton` 块 + `SkeletonCardGrid` 预设
- 替换各 View 内 `加载中…` / 空白 `isLoading` 分支
- reduced-motion 下禁用 pulse

---

## Toast（新建）

**路径**: `frontend/src/components/ui/Toast.tsx` + `hooks/useToast.tsx`

- `ToastProvider` 包裹 `App` 或 `AppShell`
- `toast.success(message)` — 3s 自动消失，单条替换不堆叠
- 触发点：`useCardMutations` 的 create/complete/delete/restore/permanentDelete `onSuccess`

---

## Modal / Drawer / ChatPanel（改造）

- 开合：opacity + translateY(4px)，200ms
- 遮罩：fade 200ms
- ESC / 点击外部：**行为不变**

---

## LoginPage + PinCodeInput（改造）

- 垂直构图：品牌区 + 表单 + 备案占位（005）平衡，减少中部空洞
- 品牌标题：克制 glow/描边（accent 低饱和），避免廉价高饱和
- `PinCodeInput`：边框对比增强 + 引导文案「请输入四字符验证码」
- 鉴权流程：**不变**

---

## GlobalSearch（改造）

- 宽度随 TopBar 聚焦策略；下拉无结果用 `EmptyState` 紧凑变体
- 搜索候选 **不可** 拖拽（005）

---

## 明确不改动契约的组件

以下仅允许 className/token 替换，**禁止**改业务逻辑：

- `ScheduleViewRouter`、`ViewTimeNav`、`AnchorDateControl`
- `CardDetailModal`、`CreateCardModal`、`CardFormFields`（表单校验规则不动）
- `dnd/dragTrash`、`useVisibilitySync`、`useAuth`
- `ChatPanel` 消息逻辑（仅面板开合动效）
