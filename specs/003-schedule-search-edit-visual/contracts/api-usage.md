# API Usage: 003 REST 扩展

**Feature**: `003-schedule-search-edit-visual`  
**Date**: 2026-07-06

本特性 **扩展** 001 OpenAPI 语义。权威基线：

- [specs/001-conversational-scheduling/contracts/openapi.yaml](../001-conversational-scheduling/contracts/openapi.yaml)

下文仅描述 **003 增量**。

---

## 卡片

### GET /api/cards

**新增 / 扩展 query 参数**:

| 参数 | 值 | 说明 |
|------|-----|------|
| `hasTime` | `true` \| `false` | `true`：有 timeNature；`false`：无时间卡片 |
| `sort` | `time` \| `priority` \| **`title`** \| **`createdAt`** | 扩展排序；`time` 时无时间置后 |

既有参数不变：`view`, `date`, `categoryId`, `importance`, `urgency`, `timeNature`。

**视图与无时间**:

| view | 无时间卡片 |
|------|------------|
| `day` / `week` / `month` | **不包含** |
| `all` | **包含**（可用 `hasTime=false` 筛选） |

**示例**:

```http
GET /api/cards?view=all&hasTime=false&sort=title
GET /api/cards?view=all&categoryId=<uuid>&urgency=high&sort=priority
```

**Response**: `{ items: ScheduleCard[] }` — `timeNature` 可为 `null`。

---

### POST /api/cards

**无时间创建**:

```json
{
  "title": "待办：买牛奶"
}
```

**持续型**（与 002 相同，timeNature 必填且 startAt 必填）:

```json
{
  "title": "团队周会",
  "timeNature": "duration",
  "startAt": "2026-07-07T10:00:00.000Z",
  "endAt": "2026-07-07T11:00:00.000Z"
}
```

**错误**:

| 状态 | 条件 |
|------|------|
| 400 | 标题空；选了 timeNature 但未填齐时间；时间非法 |
| 409 | 标题与已有卡片重复（忽略大小写/首尾空格） |

---

### PATCH /api/cards/:id

**003 前端正式接入**（001 已有路由）。

**Request**: 部分字段；规则同 POST（含无时间 ↔ 有时间转换）。

**错误**: 400 / 404 / 409 同上。

**Response**: `200` + 完整 `ScheduleCard`

**前端**: 成功后 `invalidateQueries({ queryKey: ["cards"] })`

---

### DELETE /api/cards/:id

不变（002 行为 + 二次确认）。

---

## 聊天

### POST /api/chat/messages

**003 行为变更**:

- 响应 **`affectedCards` 恒为 `[]`**
- **`pendingConfirmation` 恒为 null**
- LLM 不再调用 schedule 工具

**Request/Response 形状不变**（前端兼容）。

**验收**: 发送「添加明天会议」→ 200 + 文本回复；`GET /api/cards` 数量不变。

---

## 全局搜索

**无新 HTTP 端点**。前端使用 `GET /api/cards?view=all` 缓存 + 客户端 `titleSearch.ts` 过滤。

若未来卡片量 >1000，可追加 `GET /api/cards?q=`（**非本特性**）。

---

## 鉴权

所有 `/api/*`（除 login/health）需 session cookie。搜索/编辑/筛选 MUST NOT 绕过鉴权。

---

## 错误处理（前端）

| 状态 | 前端行为 |
|------|----------|
| 409 Title already exists | 表单内联提示「标题已存在」，保留已填字段 |
| 400 | 展示 validation message |
| 404 on PATCH | 「卡片不存在或已删除」 |
| 网络错误 | 保留表单 draft，可重试 |

---

## DeepSeek 配置（ops）

不新增 env 变量。示例：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=<your-key>
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

Provider 抽象不变（宪法 III）。
