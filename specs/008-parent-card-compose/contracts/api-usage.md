# API Contract: Watson 008 Parent Cards

**Base path**: `/api`  
**Authentication**: 除 `/api/health`、`/api/auth/login` 外，全部端点继续要求既有会话 cookie。未授权 `401`。

## Common conventions

- JSON camelCase。
- 错误：`{ "error": "human-readable message" }`。
- 时间戳 ISO 8601；未安排时 `startAt`/`endAt` 均为 `null`。
- `kind`: `"standard"` \| `"parent"`。

## DTO: ScheduleCard（扩展）

```json
{
  "id": "uuid",
  "kind": "standard",
  "title": "string",
  "description": "string|null",
  "startAt": "string|null",
  "endAt": "string|null",
  "importance": 5,
  "urgency": 5,
  "categoryId": "string",
  "categoryName": "string",
  "categoryColor": "string|null",
  "stage": "not_started",
  "status": "active",
  "trashedAt": "string|null",
  "parentId": "string|null",
  "parentTitle": "string|null",
  "childCount": 0,
  "timeManual": false,
  "lastParentTitle": "string|null",
  "createdAt": "string",
  "updatedAt": "string",
  "children": null
}
```

| Field | When present |
|-------|----------------|
| `parentId` | 标准卡；无归属为 `null` |
| `parentTitle` | 日视图等活跃子卡：当前父卡 title；否则可 `null` |
| `childCount` | 父卡：active 子数量；标准卡可省略或 0 |
| `timeManual` | 父卡；标准卡可省略或 false |
| `lastParentTitle` | 垃圾箱标准卡；活跃卡一般为 `null` |
| `children` | 仅 `GET /api/cards/:id` 且 `kind=parent` 时为子卡数组（按 `createdAt` 升序）；列表接口为省略/`null` |

父卡响应中 `importance`/`urgency`/`stage`/`category*`/`description` 仍返回占位值，客户端不得当作可编辑语义。

---

## 1. List cards（扩展既有）

### GET `/api/cards`

Query 参数沿用：`view`, `date`, `categoryId`, `importance`, `urgency`, `scheduled`, `stage`, `sort`。

#### 可见性（本轮强制）

| `view` | 返回集合 |
|--------|----------|
| `all` | active 父卡 + active 且 `parentId=null` 的标准卡 |
| `week` / `month` | 同上且已安排并与 `date` 对应区间相交；未安排父卡不出现 |
| `day` | active 标准卡（**含**有 `parentId` 者）且与日区间相交；**不含**父卡 |
| `trash` | completed/deleted **标准卡**；带 `lastParentTitle`；**不含**父卡 |

`categoryId` / `stage` / `importance` / `urgency` 过滤：**只作用于独立标准卡**；不因这些条件隐藏父卡。

#### Response 200

```json
{ "items": [ /* ScheduleCard */ ] }
```

---

## 2. Get one card（扩展）

### GET `/api/cards/:id`

- 标准卡：返回 DTO；若有父则 `parentId`/`parentTitle` 有值；`children` 省略。
- 父卡：返回 DTO + `children: ScheduleCard[]`（active 子，按创建时间升序）。
- 已硬删父卡：`404`。

---

## 3. Compose parent

### POST `/api/cards/compose`

由两张**独立** active 标准卡创建父卡。

#### Request

```json
{
  "cardIds": ["id-a", "id-b"],
  "title": "项目名",
  "startAt": "2026-07-01T00:00:00.000Z",
  "endAt": "2026-07-31T23:59:59.999Z"
}
```

Rules:
- `cardIds` 长度必须为 2，且为两张不同的 active、`kind=standard`、`parentId=null` 卡。
- `title` 必填；normalize 后不得与任何 active 卡重名 → 否则 `409`。
- `startAt`/`endAt`：可省略；省略时后端按子卡包络填充（全未安排则皆 null）。若提供，必须成对，且不得窄于当时包络 → 否则 `400`；宽于包络则 `timeManual=true`。
- 事务：insert 父卡（`kind=parent`, `categoryId=system-none`, …）+ 两子设 `parentId`。

#### Response 201

父卡完整 DTO（含 `childCount: 2`，可不含 children 或含）。

#### Errors

| Status | Condition |
|--------|-----------|
| 400 | 参数非法、卡不符合独立标准、时间窄于包络 |
| 404 | 某 cardId 不存在 |
| 409 | 标题冲突 |

---

## 4. Add child

### POST `/api/cards/:parentId/children`

#### Request

```json
{ "cardId": "standard-id" }
```

Rules:
- 目标必须是 active 父卡。
- `cardId` 必须是 active、独立标准卡。
- 设 `parentId` 后 `recomputeParentTime`。

#### Response 200

目标父卡 DTO（更新后的 `childCount` / 时间）。

---

## 5. Merge parents

### POST `/api/cards/:parentId/merge`

#### Request

```json
{ "sourceParentId": "other-parent-id" }
```

Rules:
- 两者均为 active 父卡且不同。
- 源父所有 active 子的 `parentId` 改为目标；硬删源父；recompute 目标。
- 保留目标父名称与（合法前提下）时间；突破则扩展。

#### Response 200

目标父卡 DTO。

#### Errors

| Status | Condition |
|--------|-----------|
| 400 | 非法合并（含源=目标） |
| 404 | 任一方不存在或非父卡 |

---

## 6. Detach child

### POST `/api/cards/:cardId/detach`

Rules:
- 卡必须是 active 标准卡且 `parentId` 非空。
- 清 `parentId`；不写 `lastParentTitle`；recompute 原父；子计数为 0 则硬删原父。

#### Response 200

被移出的标准卡 DTO（`parentId: null`）。

---

## 7. Update card（扩展既有 PATCH）

### PATCH `/api/cards/:id`

**标准卡**：既有语义；若修改 `startAt`/`endAt` 且有 `parentId`，事务末 recompute 父卡。不得通过 PATCH 直接改 `kind`/`parentId`（归属走专用端点）。

**父卡**：仅允许 `title`、`startAt`、`endAt`（及成对清空为未安排——仅当无已安排子时）。  
- 标题唯一校验。  
- 时间须满足包络约束；成功则 `timeManual=true`（除非变为全空）。  
- 拒绝修改 importance/urgency/category/stage/description（`400` 或忽略并文档约定：**拒绝未知/不允许字段为 400**）。

---

## 8. Complete / Delete（扩展）

### POST `/api/cards/:id/complete`  
### DELETE `/api/cards/:id`

- 若 `kind=parent` → `400`（父卡无此操作）。
- 若标准卡有 `parentId`：写入 `lastParentTitle` ← 父 title，清 `parentId`，再软删；recompute/可能硬删父。

---

## 9. Restore（扩展）

### POST `/api/cards/:id/restore`

- 仅标准卡。
- 标题与 active 冲突：自动在 title 前加 `_` 直至唯一。
- 若有 `lastParentTitle`：归入同名 active 父卡，或创建同名父卡（父标题亦可能加 `_`）再归入；然后清空 `lastParentTitle`；recompute。

#### Response 200

恢复后的标准卡 DTO（可能带新 `parentId`）。

---

## 10. Unchanged

- `POST /api/cards` 创建：始终 `kind=standard`，`parentId=null`；不可创建父卡。
- `DELETE /api/cards/:id/permanent`：仅垃圾箱标准卡；若仍有 `lastParentTitle` 一并物理删除即可。
