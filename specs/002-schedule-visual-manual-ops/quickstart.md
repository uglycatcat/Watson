# Quickstart: 日程可视化与手动操作增强

**Feature**: `002-schedule-visual-manual-ops`  
**Purpose**: 002 增量验收指南（在 001 quickstart 环境就绪后执行）

**Prerequisites**: 完成 [001 quickstart](../001-conversational-scheduling/quickstart.md) §1–3（安装、迁移、dev 运行、已登录）

## 1. 安装新增依赖

```bash
cd /home/anna/MY_WS/watson
npm install date-fns-tz -w frontend
```

## 2. 启动

```bash
npm run dev
```

登录后主界面应仍为 TopBar + 主区 + 侧栏。

---

## 3. 验收场景

### 3.1 主题二态（P6 / FR-012–014）

1. 点击主题按钮：仅在浅色 ↔ 深色切换，无第三态。
2. 若 DB 中 `theme=system`（001 默认）：界面以浅色显示，且可切换到深色。
3. PATCH 后刷新：主题保持；另一浏览器登录同实例：主题同步（preferences API）。

### 3.2 AI 助手栏（P5 / FR-009–011）

1. 顶部侧栏开关（桌面+移动均可见）：隐藏后主区全宽。
2. 同会话内刷新：隐藏状态保持。
3. 关闭浏览器 tab 后重新打开：助手栏**默认显示**。
4. 拖动主区与侧栏间分隔条：宽度变化；刷新后宽度恢复（localStorage）。
5. 另一浏览器：宽度为各自默认/本地值，不同步。

### 3.3 月视图网格（P2 / FR-004, FR-004a）

1. 切换月视图：见按周排列日期格，非纯列表。
2. 创建跨 3 天的持续型卡片：月视图见跨格条带，标题在起始日。
3. 某日 >3 张卡片：格内最多 3 张 +「+N 更多」。
4. 点击日期格或「+N」：左侧 Drawer 列出该日全部卡片，仍处月视图。
5. Drawer 内点击卡片：居中详情 Modal；关闭 Modal 后 Drawer 仍开。

### 3.4 周视图（P3 / FR-005, FR-005a）

1. 切换周视图：周一–周日七列。
2. 跨日持续型：跨列条带，标题在起始列。
3. 空列显示「无安排」。
4. 上一周/下一周/本周导航正确。

### 3.5 卡片详情与删除（P1 / FR-001–003）

1. 在日/周/月/全部视图点击卡片：3 秒内见居中 Modal 含全部基本字段。
2. 点击删除 → 二次确认含标题 → 取消则不删。
3. 确认删除 → 卡片消失；Chat 对话删除仍须确认（行为一致）。

### 3.6 手动创建（P4 / FR-007–008）

1. 点击 TopBar「+」：打开创建 Modal。
2. 仅填必填项提交：卡片出现当前视图；默认重要/紧急为「中」。
3. 结束早于开始：拒绝并提示，不创建。
4. 网络错误：提示错误，表单内容保留。

### 3.7 日视图 / 全部视图（FR-006）

1. 日视图：当日列表；无安排时空状态。
2. 全部视图：筛选/排序仍可用；卡片可点开详情。

---

## 4. 时区抽检（Asia/Shanghai）

1. 确认 `GET /api/preferences` → `timezone: "Asia/Shanghai"`（或 config 默认）。
2. 创建开始时间为「今日 23:30–次日 01:00」的持续型卡片：
   - 月视图条带应覆盖两个日期格（按 Shanghai 日历日）。
3. 「今天」高亮与系统日期在 Shanghai 下一致。

> 若验收发现月首尾丢卡片：检查服务器 TZ 与 preferences.timezone；见 plan.md「可选后端增强」。

---

## 5. 后端零改动确认

```bash
git diff backend/
```

预期：**无文件变更**（或仅文档/依赖 lock 以外无逻辑改动）。

API 冒烟：

```bash
# 已登录 cookie 环境下
curl -s -b cookies.txt 'http://localhost:3000/api/cards?view=month&date=2026-07-06' | head
curl -s -b cookies.txt -X POST 'http://localhost:3000/api/cards' \
  -H 'Content-Type: application/json' \
  -d '{"title":"test","timeNature":"deadline","deadlineAt":"2026-07-10T12:00:00.000Z","categoryId":"<id>"}'
```

OpenAPI 仍指向 001 版本，无 002 delta 文件。

---

## 6. 通过标准

- quickstart §3 全部场景通过
- spec Success Criteria SC-001–SC-007 可人工抽检
- 无未鉴权创建/删除路径

**Next**: `/speckit-tasks` 拆分实现任务。
