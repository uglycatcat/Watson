# API Usage: 005 增量

**Feature**: `005-view-nav-drag-time`  
**Date**: 2026-07-16

相对 [004 api-usage](../../004-priority-trash-coordinate/contracts/api-usage.md)。**无新路由**；语义收紧如下。

---

## POST /api/cards & PATCH /api/cards/:id

### 时间体规则（服务端）

| 请求 startAt / endAt | 行为 |
|---------------------|------|
| 皆 null/省略 | 未安排 |
| 仅 endAt | 补 startAt：POST→现在；PATCH→该卡 `createdAt`；然后校验 end≥start |
| 仅 startAt | 补 endAt = startAt + 24h |
| 皆有 | 校验 end≥start，否则 400 |
| 补齐后仍非法 | 400 |

### 错误

| 状态 | 条件 |
|------|------|
| 400 | end &lt; start；无法补齐为合法区间 |
| 409 | 标题冲突（active） |
| 409 | PATCH 非 active（004） |

### 拖拽删除

```http
DELETE /api/cards/:id
```

与详情确认后删除相同（软删→deleted）。前端拖拽路径不弹确认，直接调用。

---

## GET /api/cards

- `scheduled=true`：建议仅返回 start 与 end 皆非 null 的 active 卡
- 日/周/月 range：依赖起止皆有的区间重叠（无 end 的历史行应先 backfill）

---

## 鉴权

不变；无新公开端点。
