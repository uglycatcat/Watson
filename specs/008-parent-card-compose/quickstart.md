# Quickstart Validation: Watson 008 Parent Cards

**Feature**: `008-parent-card-compose`  
**Purpose**: 验证 migration、组合 API、视图可见性、DnD 共存、清零/恢复及 001～007 回归。

## Prerequisites

- Node.js 22
- `npm install` 已完成
- 默认可访问码 `ANNA`（或 `WATSON_ACCESS_CODE`）

```bash
npm install
npm run build
```

Expected: 前后端 TypeScript build 成功；`ScheduleCard` 含 `kind`/`parentId` 等字段无类型错误。

## V0 — Migration smoke

### Empty database

```bash
rm -f /tmp/watson-008-empty.db
DATABASE_PATH=/tmp/watson-008-empty.db npm run db:migrate
```

Expected:
- 含 `0011_parent_cards` 在内的迁移成功；重跑幂等
- `schedule_cards` 存在列：`kind`, `parent_id`, `time_manual`, `last_parent_title`
- 新库无行时结构正确

### Upgrade from existing data

1. 复制脱敏备份到 `/tmp/watson-008-upgrade.db`
2. 记录升级前卡片数、标题、status、时间
3. `DATABASE_PATH=/tmp/watson-008-upgrade.db npm run db:migrate`

Expected:
- 行数与既有业务字段不变
- 全部历史行 `kind='standard'`, `parent_id` NULL, `time_manual=0`
- `category_id` 仍非空；应用可启动

## V1 — Start and authenticate

```bash
DATABASE_PATH=/tmp/watson-008-empty.db npm run dev
```

```bash
curl -i -c /tmp/watson-008-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{"code":"ANNA"}' \
  http://localhost:3000/api/auth/login
```

Expected: 200 + session cookie。

## V2 — Compose / add / merge / detach

准备两张独立标准卡 A、B（可经 UI「+」或 POST `/api/cards`），再一张 C；另组父卡流程可再建 D、E。

1. `POST /api/cards/compose` 用 A+B，合法 title 与可选更宽时间  
   Expected: 201 父卡；`GET ?view=all` 见父不见 A/B；`childCount=2`
2. `POST /api/cards/:parentId/children` 加入 C  
   Expected: `childCount=3`；C 不再出现在 all 一级
3. 再 compose D+E 得父卡 P2；`POST .../merge` 把 P2 并入 P1  
   Expected: P2 消失；其子在 P1 下
4. `POST /api/cards/:childId/detach` 移出一子  
   Expected: 该子重现于 all；父 `childCount` 减一
5. 负面：compose 重名 title → 409；时间窄于包络 → 400；对父卡 complete → 400

## V3 — Time envelope

1. 两张已安排子卡组成父卡，不选手调 → 父时间 = 包络  
2. PATCH 父卡时间更宽 → `timeManual` 真；缩子卡时间仍保留更宽父时间  
3. 把某子卡结束调到超出父结束 → 父结束被动扩展  
4. 尝试 PATCH 父时间更窄 → 400  
5. 仅未安排子卡的父 → 父 `startAt`/`endAt` null，仅出现在 all 未安排段

## V4 — View visibility

| 检查 | Expected |
|------|----------|
| all | 父卡 + 独立卡；无成员子卡 |
| week/month | 已安排父卡进网格；无子卡条 |
| day | 有 parentId 的子卡进三区；无父卡；折页可点开父详情 |
| trash | 无父卡；完成/删除过的子卡显示 `lastParentTitle` |
| 坐标图 | 仅标准卡点；含成员子卡；无父卡点 |

## V5 — Clear-zero and restore

1. 父卡仅剩 1 子 → 父仍在  
2. detach 或 complete/delete 最后一子 → 父卡硬删（GET 父 id → 404；垃圾箱无父卡）  
3. 恢复带 `lastParentTitle` 的子且同名父仍在 → 归回该父  
4. 父已清零后再恢复该子 → 重建同名父并归入  
5. 恢复时标题撞名 → 自动加 `_` 前缀直至可恢复

## V6 — DnD coexistence (UI)

在全部视图：
1. 标准拖到标准 → 确认框 → 组合成功 + toast  
2. 标准拖到父 → 直接加入  
3. 父拖父 → 合并  
4. 父拖标准 → 禁止态，数据不变  
5. 任意卡拖到右上垃圾箱 → 仍为软删（与组合无关）  
6. 开启系统「减少动态效果」→ 仍可完成组合/移出

## V7 — Parent detail UI

1. 全部点父卡与日视图点折页 → 同一详情  
2. 改名重名 / 时间过窄 → 就地红字不保存  
3. 迷你网格拖出 → 移出成功  
4. 父卡无完成/删除按钮；无优先级/分类/阶段编辑

## V8 — Regression 001～007

抽查：登录、标准卡 CRUD、日周月全部、完成/删除/恢复/永久删除、坐标图、分类/阶段/日报、未安排仅 all、拖到垃圾箱删除。

Expected: 行为与升级前一致（除本轮新增父卡能力）。

## V9 — Build gate

```bash
npm run build
```

Expected: 通过。
