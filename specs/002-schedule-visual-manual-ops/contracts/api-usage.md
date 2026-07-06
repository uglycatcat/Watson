# API Usage: 002 前端消费既有 REST（无 OpenAPI 变更）

**Feature**: `002-schedule-visual-manual-ops`  
**Date**: 2026-07-06

本特性 **不修改** REST 契约。权威 OpenAPI 仍为：

- [specs/001-conversational-scheduling/contracts/openapi.yaml](../001-conversational-scheduling/contracts/openapi.yaml)

下文描述 002 **新增的前端调用**与 **视图取数约定**。

---

## 卡片

### GET /api/cards

**用途**: 四视图数据源（与 001 相同）

| 视图 | Query | 002 前端用法 |
|------|-------|--------------|
| 日 | `view=day&date=YYYY-MM-DD` | DayView 列表 |
| 周 | `view=week&date=YYYY-MM-DD` | WeekView 七列 + 条带（`date` 为周内任意日） |
| 月 | `view=month&date=YYYY-MM-DD` | MonthView 网格（`date` 为月内任意日） |
| 全部 | `view=all&sort=time\|priority&importance=...` | AllView |

**002 补充**:
- 月/周视图在客户端按 `preferences.timezone` 将返回卡片归到日格/列
- 日抽屉可选：对打开日再请求 `view=day&date=` 或客户端从月数据过滤（实现任选，行为一致即可）

### POST /api/cards

**用途**: 手动创建表单提交

**Request body**（`ScheduleCardInput`）:

```json
{
  "title": "团队周会",
  "timeNature": "duration",
  "startAt": "2026-07-07T10:00:00.000Z",
  "endAt": "2026-07-07T11:00:00.000Z",
  "importance": "medium",
  "urgency": "medium",
  "categoryId": "<uuid>"
}
```

**Response**: `201` + `ScheduleCard`

**前端**: 成功后 `invalidateQueries({ queryKey: ["cards"] })`

### DELETE /api/cards/:id

**用途**: 卡片详情 Modal 删除

**Response**: `204`

**前端**: 必须先 `ConfirmDialog`；成功后关闭 Modal 并 invalidate cards

### GET /api/cards/:id

**用途**: 可选；若列表项已含完整字段，详情 Modal 可直接用内存 DTO，无需此请求

---

## 分类

### GET /api/categories

**用途**: 创建表单分类下拉

**Response**: `{ items: [{ id, name, isPreset }] }`

---

## 偏好

### GET /api/preferences

**用途**:
- `theme` — useTheme（system 前端归一化为 light）
- `timezone` — 日历网格日界线（默认 Asia/Shanghai）

### PATCH /api/preferences

**002 仅写**: `{ "theme": "light" | "dark" }`（用户切换主题时）

---

## 鉴权

所有 `/api/*`（除 login/health）需 session cookie（与 001 相同）。手动创建/删除 MUST NOT 绕过鉴权。

---

## 错误处理

| 状态 | 前端行为 |
|------|----------|
| 401 | 跳转登录 |
| 400 | 表单/Modal 展示 `error` 文案，保留用户输入 |
| 404 | 删除时提示卡片不存在并关闭 Modal |

---

## Sync

`useVisibilitySync` 与 ChatPanel 仍使用 `invalidateQueries(["cards"])`；002 mutations 采用相同 invalidate 策略，保证多标签页一致。
