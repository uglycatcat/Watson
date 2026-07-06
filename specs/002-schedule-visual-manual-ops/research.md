# Research: 日程可视化与手动操作增强

**Feature**: `002-schedule-visual-manual-ops`  
**Date**: 2026-07-06

## R-001: 后端改动范围

**Decision**: **后端零改动**（不修改 routes、services、schema、migrations）

**Rationale**:
- Spec FR-015/016 明确不改变卡片模型与增删改查语义
- 001 已实现 `GET/POST/DELETE /api/cards`、`GET/PATCH /api/preferences`、`GET /api/categories`
- 前端 `api.ts` 仅缺 create/delete 封装

**Alternatives considered**:

| 方案 | 优点 | 拒绝原因 |
|------|------|----------|
| PATCH preferences 禁止 system | API 更干净 | 非必须；前端归一化即可满足 FR-013 |
| rangeForView 使用 timezone | 服务端边界精确 | 增加后端 scope；单用户单 TZ 部署下前端归日足够 |
| 新增 GET /api/cards/calendar | 专用日历 DTO | 重复 001 列表能力；YAGNI |

---

## R-002: 主题 system 迁移策略

**Decision**: **前端读取时归一化 + 写入仅 light/dark**

**Rationale**:
- DB `owner_preferences.theme` 仍可为 `system`（001 schema 不变）
- `useTheme`：`effectiveTheme = prefs.theme === "system" ? "light" : prefs.theme`
- `toggleTheme`：在 `light` ↔ `dark` 间切换并 `PATCH { theme }`
- DOM：`document.documentElement.classList.toggle("dark", effectiveTheme === "dark")`；移除 `matchMedia` 分支

**Alternatives considered**:
- DB migration 批量改 system→light：不必要，且涉及后端
- 首次加载自动 PATCH light：会产生无意义写入；仅 UI 归一化即可

---

## R-003: 日历网格日期与时区（Asia/Shanghai）

**Decision**: **前端 `date-fns` + `date-fns-tz`，时区取自 `GET /api/preferences.timezone`（默认 `Asia/Shanghai`）**

**Rationale**:
- Spec Assumptions 与 setup.md 要求沿用 Asia/Shanghai 偏好
- 001 后端 `rangeForView` 使用 `new Date(dateStr)`（服务器本地 TZ），与 preferences.timezone **未打通**
- 002 策略：
  1. 仍调用 `GET /api/cards?view=month|week&date=YYYY-MM-DD` 获取范围内卡片（与 001 相同）
  2. 网格 `DayCell.date` 用 `formatInTimeZone(..., tz, "yyyy-MM-dd")` 生成
  3. 卡片归日：将 `startAt/endAt/deadlineAt` ISO 转为 TZ 下日期字符串，再匹配 cell
  4. `todayStr()` 改为 TZ-aware（替换浏览器本地 `format(new Date(), ...)`）

**Edge case**: 若服务器 TZ ≠ Asia/Shanghai，API 返回的月范围卡片可能与网格首尾差 1 天。**Mitigation**: 部署文档约定服务器 TZ=Asia/Shanghai 或接受极小偏差；不在本特性改后端。

**Alternatives considered**:
- 纯浏览器本地时区：与 preferences.timezone 字段不一致
- 后端传 `timezone` query param：需改 schedule.service

**Dependencies**: 新增 npm 包 `date-fns-tz`（frontend workspace）

---

## R-004: 跨日条带布局算法

**Decision**: **CSS Grid 7 列 + 绝对定位 overlay 层 + 贪心 lane 分配**

**Rationale**:
- Spec 要求月视图跨格条带、周视图跨列条带，标题在起始格/列
- 实现步骤：
  1. 构建 `weeks × 7` 网格 DOM
  2. 单日事件（span=1）渲染在 cell 内 chip 区
  3. 多日 `duration` 卡片：计算 `startCol`, `endCol`, `weekRow`；同 row 内按 startCol 排序贪心分配 `lane`（0..3）
  4. 条带 `style={{ gridColumn: `${startCol+1} / ${endCol+2}`, top: lane * LANE_HEIGHT }}`
  5. 点击条带 → 打开 CardDetailModal

**Alternatives considered**:
- FullCalendar：过重，违反轻量约束
- 每格重复卡片（clarify 已否决）
- 纯 flex 无 grid：跨列定位困难

**Constants**（plan 阶段量化，tasks 可微调）:
- `MAX_CHIPS_PER_CELL = 3`
- `LANE_HEIGHT = 22px`
- `MAX_VISIBLE_LANES = 4`（超出则仍显示 +N 在日抽屉）

---

## R-005: 弹层组件形态

**Decision**:

| 用途 | 形态 | 组件 |
|------|------|------|
| 卡片详情 + 删除 | **居中 Modal** | `CardDetailModal`（spec 澄清 A） |
| 手动创建 | **居中 Modal** | `CreateCardModal`（与详情复用 `ui/Modal`） |
| 月视图全日列表 | **侧滑 Drawer** | `DayScheduleDrawer`（主区左缘，spec 澄清 D） |
| 删除二次确认 | Modal 内嵌或 `ConfirmDialog` | 明确标题文案 |

**Rationale**:
- 详情 Modal 与日 Drawer 职责分离，避免双层侧滑
- 不引入 shadcn Dialog（001 未安装）；Tailwind + React portal 约 80 行/基元

**Reusable stack**:
- `ui/Modal` — `{ open, onClose, title, children }`
- `ui/Drawer` — `{ side: "left"|"right", open, onClose, children }`
- `ui/ConfirmDialog` — `{ message, onConfirm, onCancel }`

---

## R-006: AI 助手栏拖拽调宽

**Decision**: **Pointer Events + localStorage 持久化**

**Rationale**:
- Spec FR-010/011：宽度本设备持久；显隐 session 级
- 实现：
  - 分隔条宽 4px，`cursor: col-resize`
  - `pointerdown` 记录 `startX`, `startWidth`
  - `pointermove`：`newWidth = clamp(startWidth - deltaX, MIN, MAX)`（aside 在右侧，向左拖变宽）
  - `pointerup`：写入 `localStorage.setItem("watson:chatPanelWidth", String(width))`
  - aside 宽度：`style={{ width }}` 替代固定 `md:w-96`

**Bounds**:
- `MIN_WIDTH = 280`（聊天输入可用）
- `MAX_WIDTH = min(560, floor(window.innerWidth * 0.45))`
- `MAIN_MIN_WIDTH = 320`（拖拽时动态收紧 MAX）

**Alternatives considered**:
- CSS `resize: horizontal`：浏览器样式不可控，移动端差
- 写入 preferences API：违反 spec「宽度不跨设备同步」

---

## R-007: TanStack Query 变更策略

**Decision**: **扩展 queryKey 不变；新增 mutations 统一 invalidate `["cards"]`**

**Rationale**:
- 001 已有 `["cards", view, date]` / `["cards", "all", params]`
- `useCardMutations`：
  - `createCard` → `invalidateQueries({ queryKey: ["cards"] })`
  - `deleteCard` → 同上；关闭 Modal
- 可选优化：`setQueryData` 乐观删除（非必须）

**Categories**: 创建表单 `useQuery({ queryKey: ["categories"], queryFn: api.getCategories })`

---

## R-008: chatOpen 会话持久化

**Decision**: **sessionStorage `watson:chatOpen`**

**Rationale**:
- Spec 澄清：仅会话级；新浏览器会话默认显示
- 初始化：`sessionStorage.getItem(...) ?? "1"` → boolean
- `toggle` 时同步写入
- **不**使用 localStorage（与 FR-011 一致）

**Note**: setup.md 原文「沿用 chatOpen state」；002 将持久化级别明确为 sessionStorage，而非仅 React useState。
