# Implementation Plan: 视图导航、拖拽归档与时间模型收紧

**Branch**: `005-view-nav-drag-time` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-view-nav-drag-time/spec.md`  
**User constraints**（来自 setup.md）: 以前端为主；Fastify + SQLite/Drizzle、React 19 + Vite + Tailwind + TanStack Query、单端口。预期**无 schema 级新 migration**，后端仅改校验/默认值与可选数据兜底；明确纯前端 vs 触及后端。

## Summary

第五轮在 004 之上补齐：**日/月时间导航**、**日视图右侧常驻坐标图**、**拖拽到垃圾箱删除**、**导航栏日期不可清空 + 回到今天 + 全部视图仍显示日期**、**登录页备案占位**、**周/月视觉收紧**，并**收紧时间模型**（已安排必有起止；只填结束→开始=创建时刻；填开始→结束默认+24h）。

技术路径：**纯前端占绝大多数**；后端仅 `schedule.service` 的 `resolveTime`/create/update 与可选一次性 SQL 兜底「有开始无结束」行。拖拽复用既有软删除 API，无新端点。

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x

**Primary Dependencies**:
- Backend: Fastify, Drizzle ORM, SQLite
- Frontend: React 19, Vite, Tailwind 4, TanStack Query, date-fns / date-fns-tz

**Storage**:
- 无新列；可选 `0005_backfill_end_at.sql`（仅 UPDATE 数据，非改 schema）或启动时一次性 UPDATE
- `anchorDate` 仍为前端 state（AppShell），永不 null

**Testing**: 手工 quickstart；可选扩展 schedule.service 时间校验用例

**Target Platform**: 浏览器响应式；桌面拖拽为主，触摸降级见 research

**Project Type**: Web monorepo（`backend/` + `frontend/`）

**Performance Goals**: 拖拽松手后 invalidate 后视图 5s 内一致；日视图左右分栏滚动不卡顿

**Constraints**:
- 已安排 ⇔ startAt 与 endAt 皆非 null；未安排 ⇔ 皆 null
- 拖拽 = soft delete，无确认；详情删除仍确认
- 日视图常驻坐标；全部视图保持按钮弹出
- 宪法 IV 已于 v1.3.1 对齐「已安排必有起止」

**Scale/Scope**: 单用户；预计 15–25 前端文件 + 1 后端服务文件（±1 SQL 兜底）

## Constitution Check

*GATE: Must pass before Phase 0. Re-check after Phase 1.*

Reference: `.specify/memory/constitution.md` (Watson **v1.3.1**)

| Principle | Gate | Pass Criteria | Phase 0 | Phase 1 |
|-----------|------|---------------|---------|---------|
| I. 单用户安全第一 | Auth | 无新未鉴权端点；拖拽走既有 DELETE | ✅ | ✅ |
| II. 密钥外置 | Secrets | 无新密钥 | ✅ | ✅ |
| III. AI 可插拔 | LLM | AI 仍不写日程；拖拽仅 UI→API | ✅ | ✅ |
| IV. 日程卡片核心 | Data model | 仍 Schedule Card；**收紧为已安排必有起止**（见 Complexity） | ✅ | ✅ |
| V. 多设备一致 | Client | 同 API；触摸降级为详情删除，非另套数据路径 | ✅ | ✅ |

- [x] All gates pass — proceed to Phase 0
- [x] Re-checked after Phase 1 design — all gates pass

## Project Structure

### Documentation

```text
specs/005-view-nav-drag-time/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   └── ui-components.md
└── tasks.md                 # /speckit-tasks
```

### Source Code（改动范围）

```text
watson/
├── backend/
│   ├── drizzle/0005_backfill_end_at.sql   # 【可选】仅 UPDATE 兜底
│   └── src/services/schedule.service.ts   # resolveTime / create / update
└── frontend/src/
    ├── pages/LoginPage.tsx                # 备案占位
    ├── layouts/AppShell.tsx               # anchorDate 永不空
    ├── components/
    │   ├── TopBar/TopBar.tsx               # 日期控件、回到今天、all 显示日期
    │   ├── TopBar/AnchorDateControl.tsx   # 【新建】不可清空日期 + 回到今天
    │   ├── ScheduleViews/
    │   │   ├── ViewTimeNav.tsx            # 【新建】通用前一/当前/后一
    │   │   ├── DayView.tsx                # 左右分栏 + 常驻坐标
    │   │   ├── WeekView.tsx / MonthView.tsx
    │   │   ├── AllView.tsx                # 坐标仍按钮
    │   │   ├── CardGrid.tsx               # draggable
    │   │   └── QuadrantView.tsx           # 复用；日视图嵌入模式
    │   ├── calendar/SpanBar.tsx           # 粗细×2.5、顶端下移
    │   ├── cards/CardFormFields.tsx       # 时间规则 UI/校验
    │   └── dnd/                           # 【新建】drag-trash helpers
    └── hooks/useCardMutations.ts          # 拖拽删除可复用 deleteCard
```

**Structure Decision**: 延续 monorepo；**触及后端**仅时间校验与可选 backfill；其余纯前端。

## 纯前端 vs 触及后端

| 类别 | 项 |
|------|-----|
| **Backend** | `resolveTime`：有开始必有结束；仅结束→开始=now（create）或 createdAt（update）；开始无结束→结束=开始+24h；end≥start；可选 SQL 兜底历史仅开始行 |
| **纯前端** | 备案占位；ViewTimeNav；日嵌入坐标；DnD 删除；TopBar 日期/回到今天/all 显示；周月视觉；表单时间 UX |

## Implementation Phases（指引）

### Phase A — 时间规则 【Backend + Frontend】

1. 后端 `resolveTime` 按三种情形改写；create/update 兜底  
2. 可选 `0005_backfill_end_at.sql`  
3. `CardFormFields`：去掉「结束依赖开始」禁用；填开始自动+24h；只填结束时提交前补开始；校验与后端一致  

### Phase B — 导航与日期控件 【Frontend】

`ViewTimeNav`；Day/Month 接入；`AnchorDateControl`；TopBar all 显示日期、trash 隐藏  

### Phase C — 日视图坐标 + 拖拽 【Frontend】

DayView 左右布局；Trash drop target；CardGrid/芯片/SpanBar draggable  

### Phase D — 视觉 + 登录占位 【Frontend】

周月留白与 SpanBar 尺寸；LoginPage footer  

### Phase E — 验收

对照 [quickstart.md](./quickstart.md)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ~~宪法 IV「结束时间可选」~~ | 已由宪法 **v1.3.1** MINOR 修宪关闭（analyze C1） | — |

## Agents

仓库无 `update-agent-context` 脚本；以 `specs/005-view-nav-drag-time/*` 与 `.specify/feature.json` 为准。
