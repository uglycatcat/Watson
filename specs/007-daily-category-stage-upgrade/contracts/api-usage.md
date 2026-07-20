# API Contract: Watson 007

**Base path**: `/api`  
**Authentication**: 除 `/api/health`、`/api/auth/login` 外，全部端点继续要求既有 HttpOnly + SameSite=Strict 会话 cookie。未授权统一返回 `401`。

## Common conventions

- Request/response 使用 JSON，字段为 camelCase。
- 错误响应：`{ "error": "human-readable message" }`。
- 日期字符串严格使用 `YYYY-MM-DD`。
- 时间戳使用 ISO 8601 UTC 字符串。
- 不在接口中返回或接受渲染后的 Markdown/HTML。

## 1. Daily Reports

### GET `/api/daily-reports/:date`

读取某个锚定日期的日报。

#### Path

| Parameter | Type | Rules |
|-----------|------|-------|
| `date` | string | 严格 `YYYY-MM-DD` 且必须是真实日历日期 |

#### Response 200

存在记录：

```json
{
  "item": {
    "date": "2026-07-20",
    "goal": "完成第七轮规划",
    "result": "已完成规格与设计",
    "analysis": "先固定数据边界可减少返工",
    "createdAt": "2026-07-20T12:00:00.000Z",
    "updatedAt": "2026-07-20T12:30:00.000Z"
  }
}
```

尚未保存：

```json
{
  "item": null
}
```

#### Errors

| Status | Condition |
|--------|-----------|
| 400 | 日期格式非法或日期不存在 |
| 401 | 未登录 |

### PUT `/api/daily-reports/:date`

以完整快照创建或替换某日三栏内容。相同日期重复 PUT 为 upsert。

#### Request

```json
{
  "goal": "string",
  "result": "string",
  "analysis": "string"
}
```

Rules:
- 三个字段都必须出现且必须是字符串。
- 空串合法。
- 字段保存原始纯文本，不在后端解析 Markdown。
- 未声明字段不接受；实现应按现有错误策略拒绝或忽略，但不得持久化。

#### Response 200

返回完整 DailyReport DTO，格式与 GET 的 `item` 相同但不包裹 `item`。

#### Upsert semantics

- 首次 PUT：`createdAt = updatedAt = now`。
- 后续 PUT：保留 `createdAt`，刷新 `updatedAt`。
- 更新一个日期不得影响其他日期。

#### Errors

| Status | Condition |
|--------|-----------|
| 400 | 日期非法、字段缺失或字段非字符串 |
| 401 | 未登录 |

## 2. Categories

### GET `/api/categories`

沿用既有端点，并增加 `deletable` 供 UI 决定是否展示危险操作。

#### Response 200

```json
{
  "items": [
    {
      "id": "category-id",
      "name": "个人",
      "isPreset": true,
      "deletable": true
    },
    {
      "id": "system-none",
      "name": "无",
      "isPreset": true,
      "deletable": false
    }
  ]
}
```

Rules:
- `deletable` 只由系统不变量决定：名称归一化后为「无」时 false，其余 true。
- `isPreset` 不等同于不可删除。

### POST `/api/categories`

沿用既有创建语义。

#### Request

```json
{
  "name": "新分类"
}
```

#### Response

| Status | Meaning |
|--------|---------|
| 201 | 返回 `{ id, name, isPreset: false, deletable: true }` |
| 400 | 空、纯空白或超过既有限制 |
| 409 | trim + lowercase 后同名 |
| 401 | 未登录 |

### DELETE `/api/categories/:id`

删除指定分类，并在同一事务中把所有引用卡片改指「无」。

#### Transaction contract

1. 查找目标分类。
2. 若目标为「无」，拒绝。
3. 查找系统「无」分类。
4. 将所有 `categoryId = targetId` 的卡片（含 active/completed/deleted）改为 `noneId` 并刷新 `updatedAt`。
5. 删除目标分类。
6. 提交；任一步失败则全部回滚。

#### Response

| Status | Meaning |
|--------|---------|
| 204 | 删除及卡片改指成功，无响应体 |
| 401 | 未登录 |
| 404 | 分类不存在 |
| 409 | 尝试删除「无」或系统兜底异常 |

#### Default category after deletion

- 「个人」存在：未指定分类的新卡片默认「个人」。
- 「个人」被删除：未指定分类的新卡片默认「无」。
- 创建卡片不得自动重建「个人」。

## 3. Schedule Cards: Stage Extension

### CardStage

```typescript
type CardStage = "not_started" | "in_progress" | "wrapping_up";
```

### ScheduleCard DTO

所有返回卡片的端点在既有字段基础上增加：

```json
{
  "stage": "not_started"
}
```

该字段始终存在且不为 null。

### POST `/api/cards`

请求体新增可选 `stage`：

```json
{
  "title": "整理日报",
  "stage": "in_progress"
}
```

- 省略时默认 `not_started`。
- 非法字符串或非字符串返回 400。
- 默认分类按“个人存在，否则无”解析。
- 其他创建规则不变。

### PATCH `/api/cards/:id`

请求体可只包含：

```json
{
  "stage": "wrapping_up"
}
```

- 仅更新 stage 与 `updatedAt`。
- 不改变 startAt、endAt、status、importance 或 urgency。
- 非 active 卡继续按既有规则返回 409。
- 非法 stage 返回 400。

### GET `/api/cards`

新增 query parameter：

| Parameter | Values | Rules |
|-----------|--------|-------|
| `stage` | `not_started`, `in_progress`, `wrapping_up` | 仅允许与 `view=all` 一起使用 |

Examples:

```text
GET /api/cards?view=all&stage=in_progress
GET /api/cards?view=all&categoryId=abc&stage=wrapping_up&scheduled=true
```

Filtering:
- stage 与 categoryId、importance、urgency、scheduled 等按 AND 组合。
- 非法 stage 返回 400，不静默忽略。
- `view` 不是 `all` 时传 stage 返回 400；日/周/月/垃圾箱不新增该筛选语义。

## 4. Sync and cache contract

- cards DTO 自然携带 stage，现有卡片刷新路径无需新增独立 stage 同步接口。
- 本轮不修改 `/api/sync` 响应结构，不新增分类删除 tombstone。
- 分类创建/删除成功后，前端必须 invalidate `["categories"]` 与 `["cards"]`。
- 页面保持前台可见时，前端必须每 3 秒 invalidate 并重新读取活跃的 categories、cards 和 daily-report 查询；不得轮询未挂载的历史日报。
- 页面重新可见时，前端必须立即执行同一刷新流程，不等待下一个轮询周期。
- 日报 PUT 成功后只更新对应 `["daily-report", date]` 缓存，不 invalidate cards。

## 5. Authorization regression

以下请求在无有效 session 时都必须返回 401，且不得泄露记录是否存在：

```text
GET /api/daily-reports/2026-07-20
PUT /api/daily-reports/2026-07-20
GET /api/categories
POST /api/categories
DELETE /api/categories/:id
GET /api/cards?view=all&stage=not_started
POST /api/cards
PATCH /api/cards/:id
```

AI chat routes不得调用上述写接口或 service。
