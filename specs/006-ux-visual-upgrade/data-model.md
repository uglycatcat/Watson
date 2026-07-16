# Data Model: 体验与视觉体系升级

**Feature**: `006-ux-visual-upgrade`  
**Date**: 2026-07-16  
**Storage**: **无变更** — 不修改 SQLite schema、Drizzle 模型、API DTO

## 持久化层（不变）

`schedule_cards` 及 001～005 全部表结构、字段、校验规则、生命周期语义 **原样沿用**。本轮 **不** 新增 migration、**不** 修改 `backend/src/**`。

### schedule_cards（相对 005）

| 维度 | 006 变更 |
|------|----------|
| 列定义 | **无** |
| API 请求/响应 | **无** |
| 业务规则 | **无** |

---

## 呈现层概念（非持久化）

以下仅为前端 UI 状态与样式约定，**不写入数据库**。

### Design Tokens（`index.css`）

| Token 组 | 示例变量 | 用途 |
|----------|----------|------|
| 间距 | `--space-1` … `--space-8` | padding/gap 阶梯 |
| 圆角 | `--radius-sm`, `--radius-md`, `--radius-lg` | 卡片、按钮、分段控件 |
| 阴影 | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | 卡片抬升、浮层、tooltip |
| 字号 | `--text-xs` … `--text-2xl` | 标题/正文层级 |
| 字重 | `--font-normal`, `--font-medium`, `--font-semibold` | 排版节奏 |
| 强调色 | `--accent`, `--accent-hover`, `--accent-active`, `--accent-subtle` | 主操作、选中态 |
| 动效 | `--duration-fast/normal/slow`, `--ease-standard` | 过渡时长 |
| 象限 | `--quadrant-q1` … `--quadrant-q4` | 坐标图分区（明暗各一套） |

`:root` 与 `.dark` **各自定义完整一套**；浅色强调色 `#2563eb`，深色 `#76b900`（沿用现状）。

### CategoryAccent（派生，非存储）

```
getCategoryAccent(categoryId: string | null) → CSS color
  categoryId 为空 → neutral（--border）
  else → stableHash(categoryId) → HSL(hue, 45%, 55% dark / 50% light)
```

用于卡片左缘色带；**不**回写服务端。

### PriorityMeter（展示）

| 输入 | 输出 |
|------|------|
| `importance: 0..10` | 强度条 + 梯度色 + 可选数字 |
| `urgency: 0..10` | 同上 |

数据来源于既有卡片字段，无新字段。

### Toast（瞬时 UI）

| 字段 | 说明 |
|------|------|
| `id` | 客户端生成 |
| `message` | 成功文案 |
| `variant` | `success`（本轮仅 success） |
| `expiresAt` | 约 3s 后移除 |

### EmptyState（按视图配置）

| 视图 | 典型 copy / action |
|------|-------------------|
| day/week/month | 「这一天/周/月没有日程」→ 新建 |
| all | 「还没有日程」→ 新建 |
| trash | 「垃圾箱是空的」→ 返回日视图 |
| search | 「没有匹配的日程」→ 清空搜索 |

### Skeleton（加载）

非实体；`isLoading === true` 时渲染占位块，数据结构不变。

---

## UI 状态（非持久，延续 005）

`anchorDate`、`view`、`chatOpen`、搜索 `query`/`focused`、拖拽 `dragOverTrash` 等状态机 **不变**；仅视觉与反馈增强。

---

## API 契约

**无新端点、无字段增删、无行为语义变更。** 前端仍通过既有 `api.*` 与 TanStack Query `["cards", ...]` 取数。
