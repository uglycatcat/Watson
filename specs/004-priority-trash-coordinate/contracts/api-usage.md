# API Usage: 004 REST 变更

**Feature**: `004-priority-trash-coordinate`  
**Date**: 2026-07-15

增量相对于 003。基线：[specs/001-conversational-scheduling/contracts/openapi.yaml](../../001-conversational-scheduling/contracts/openapi.yaml) + [003 api-usage](../../003-schedule-search-edit-visual/contracts/api-usage.md)。

---

## ScheduleCard 响应形状（破坏性字段）

| 字段 | 变更 |
|------|------|
| `importance` / `urgency` | `number` 0..10（原 enum 字符串） |
| `status` | **新增** `active` \| `completed` \| `deleted` |
| `trashedAt` | **新增** ISO string \| null |
| `timeNature` | **移除** |
| `deadlineAt` | **移除** |
| `startAt` / `endAt` | 保留；未安排二者皆 null |
| `createdAt` / `updatedAt` | 保留；详情展示 |

---

## GET /api/cards

### view

| view | 返回 |
|------|------|
| day / week / month | **仅 active** 且落入时间 range；**排除未安排** |
| all | **仅 active**；含未安排 |
| **trash** | **completed + deleted**，按 `trashedAt` **DESC** |

### 筛选

| 参数 | 说明 |
|------|------|
| `scheduled` | `true` \| `false` — 是否有 `startAt` |
| `importance` / `urgency` | 整数 0..10 精确匹配 |
| `categoryId` / `sort` / `date` | 同前（sort=priority 用新评分） |

**废弃**: `timeNature`, `hasTime`（建议忽略或返回 400，tasks 选定一种）。

### 示例

```http
GET /api/cards?view=all&scheduled=false&sort=createdAt
GET /api/cards?view=trash
GET /api/cards?view=day&date=2026-07-15
```

---

## GET /api/cards/:id

- 返回 active **或** 箱内卡片
- 404：不存在或已永久删除

用于搜索点开箱内只读详情。

---

## POST /api/cards

```json
{
  "title": "仅标题待办",
  "importance": 5,
  "urgency": 5
}
```

```json
{
  "title": "区间会议",
  "startAt": "2026-07-15T10:00:00.000Z",
  "endAt": "2026-07-15T11:00:00.000Z",
  "importance": 8,
  "urgency": 7
}
```

| 状态 | 条件 |
|------|------|
| 400 | 标题空；仅 end 无 start；end&lt;start；importance/urgency 越界或非整数 |
| 409 | 与另一 **active** 标题冲突 |

成功：`status=active`, `trashedAt=null`, 设 `createdAt`/`updatedAt`。

---

## PATCH /api/cards/:id

- **仅允许 `status=active`** 的内容编辑（箱内 → 404 或 409「只读」，推荐 **409** `{ "error": "Card is not active" }`）
- 部分字段；刷新 `updatedAt`
- 校验同 POST；重名仅 vs 其他 active

---

## POST /api/cards/:id/complete

- active → completed，`trashedAt=now`
- 幂等：已是 completed → 200 原样
- deleted → 400
- 无请求体

---

## DELETE /api/cards/:id

**行为变更（003→004）**: 硬删 → **软删**

- active → deleted，`trashedAt=now`
- 已在箱 → 404 或 400
- 响应：`204` 或 `200`+DTO（与现网风格对齐，推荐 **200 + card** 便于前端）

前端仍二次确认后调用。

---

## POST /api/cards/:id/restore

- completed|deleted → active，`trashedAt=null`
- 标题与其他 active 冲突 → **409**
- active → 400

---

## DELETE /api/cards/:id/permanent

- 仅 completed|deleted
- 物理删除；`204`
- active → 400（须先软删或完成）

前端二次确认。

---

## 鉴权

全部上述端点继续走会话中间件；不恢复登出 UI（`POST /api/auth/logout` 可保留但不挂导航）。

---

## 前端查询键建议

```text
["cards", view, date, filters…]
["cards", "trash"]
["card", id]
```

完成/软删/恢复/永久删成功后 `invalidateQueries({ queryKey: ["cards"] })`。
