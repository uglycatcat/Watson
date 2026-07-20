# Quickstart Validation: Watson 007

**Feature**: `007-daily-category-stage-upgrade`  
**Purpose**: 验证 migration、接口、日视图、表单、视觉反馈及 001～006 回归。

## Prerequisites

- Node.js 22
- npm workspace dependencies installed
- 可使用一份临时 SQLite 数据库
- 默认访问码 `ANNA`，或使用环境变量 `WATSON_ACCESS_CODE`

```bash
npm install
npm run build
```

Expected:
- frontend TypeScript + Vite build 成功
- backend TypeScript build 成功
- 无 stage、DailyReport 或分类响应类型错误

## V0 — Migration smoke

### Empty database

```bash
rm -f /tmp/watson-007-empty.db
DATABASE_PATH=/tmp/watson-007-empty.db npm run db:migrate
```

Expected:
- 0000～0008 全部成功
- 再执行一次命令仍成功
- `daily_reports` 存在且为空
- `schedule_cards.stage` 非空默认 `not_started`
- `categories.name_lower = '无'` 恰好一条

已有「无」兼容检查：
1. 在仅执行到 0007 的临时库中预先创建一个随机 ID、`name_lower='无'` 的分类并让卡片引用它。
2. 执行 0008。

Expected:
- migration 保留已有 ID 和卡片引用
- 该记录被标记为系统分类
- 不产生第二条「无」，也不因唯一索引失败

### Upgrade from 0005-era data

1. 复制一份真实数据的脱敏备份到 `/tmp/watson-007-upgrade.db`。
2. 记录升级前卡片数量、标题、分类、时间和 status。
3. 执行：

```bash
DATABASE_PATH=/tmp/watson-007-upgrade.db npm run db:migrate
```

Expected:
- 卡片数量和既有字段值不变
- 每张历史卡 stage 为 `not_started`
- 既有 categoryId 不被批量改为「无」
- 「无」存在
- 重跑 migration 幂等

## V1 — Start and authenticate

```bash
DATABASE_PATH=/tmp/watson-007-empty.db npm run dev
```

另开终端：

```bash
curl -i -c /tmp/watson-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{"code":"ANNA"}' \
  http://localhost:3000/api/auth/login
```

Expected: 200 且写入 session cookie。

未经登录直接请求以下任一新端点：

```bash
curl -i http://localhost:3000/api/daily-reports/2026-07-20
```

Expected: 401，不泄露日报是否存在。

## V2 — Daily report API

### Absent

```bash
curl -b /tmp/watson-cookie.txt \
  http://localhost:3000/api/daily-reports/2026-07-20
```

Expected:

```json
{"item":null}
```

### Upsert

```bash
curl -b /tmp/watson-cookie.txt \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"goal":"# Goal","result":"- Result","analysis":"**Insight**"}' \
  http://localhost:3000/api/daily-reports/2026-07-20
```

Expected:
- 200，返回三栏与 createdAt/updatedAt
- 再次 GET 内容一致
- 第二次 PUT 保留 createdAt、刷新 updatedAt
- PUT 另一个日期不覆盖 2026-07-20
- 非法日期、缺字段、非字符串字段返回 400
- 本地单实例中 GET 与 PUT 均在 1 秒内返回成功或失败反馈

## V3 — Daily report UI

1. 打开日视图并锚定 `2026-07-20`。
2. 开始计时。
3. 分别点击 Goal、Result、Analysis & Insight，输入 Markdown。
4. 每栏失焦。
5. 切换到下一日，再返回。
6. 停止计时，再切换周/月/全部/垃圾箱。

Expected:
- 编辑时为纯文本 textarea
- 失焦后自动保存并渲染 Markdown
- 再点击恢复原始文本
- 日期切换后各日内容隔离
- 其他视图不显示日报
- Markdown 中原始 `<script>` 或事件属性不执行
- 完整录入、保存、Markdown 回看及切日返回验证在 2 分钟内完成

Failure check:
1. 编辑日报后临时断网并失焦。
2. 确认出现未保存提示且输入仍在。
3. 恢复网络后可重试。
4. 保存未完成时快速切日，内容不得写错日期。

Responsive check:
- 桌面三列
- 窄屏按 Goal、Result、Analysis & Insight 堆叠三行

## V4 — Category create/delete and fallback

### Create

1. 打开创建卡片表单。
2. 开始计时，从分类控件旁新增「项目A」、选用它，再删除并确认。
3. 停止计时，随后再次新增「项目A」并尝试相同名称和仅空白名称。

Expected:
- 「项目A」立即可选
- 同名 409 转成可见错误
- 空白名称不能提交
- 首次新增、选用、删除完整流程在 60 秒内完成

### Delete custom category

1. 创建两张属于「项目A」的卡片，一张保持 active，另一张完成或删除进垃圾箱。
2. 删除「项目A」并确认危险提示。
3. 检查全部视图和垃圾箱。

Expected:
- 分类删除成功
- 两张卡均改归「无」
- 卡片本身未删除
- 恢复垃圾箱卡片后分类仍为「无」

### Protected fallback

尝试通过 UI 和 API 删除「无」。

Expected:
- UI 不提供可用删除操作
- API 返回 409
- 「无」仍存在

### Delete personal

1. 删除「个人」。
2. 新建卡片且不主动选择分类。

Expected:
- 「个人」不会被 seed、刷新或建卡路径自动重建
- 新卡默认分类为「无」

## V5 — Stage migration, edit and filter

1. 检查升级前历史卡片，stage 显示「未开始」。
2. 新建卡片且不改 stage。
3. 分别创建/编辑三张卡为未开始、正在处理、等待收尾。
4. 在“全部”视图逐项筛选，并同时叠加分类和安排状态筛选。
5. 在日、周、月视图及周/月日期抽屉检查卡片。

Expected:
- 历史与新卡默认 `not_started`
- 三种 stage 保存后刷新仍保持
- 修改 stage 不改变 start/end/status
- 全部视图 stage 筛选准确且与其他条件 AND
- 日/周/月没有新增 stage 筛选器，但 CardGrid、SpanBar 和日期抽屉卡片均有可读 stage 标识
- 明暗主题下徽章文字均可辨

API negative checks:
- 非法 stage 创建/更新返回 400
- `view=day&stage=in_progress` 返回 400

## V6 — Day sections

在多个相邻日期准备至少 20 张已安排卡片，并确保至少覆盖以下类型：

| Case | Start | End | Expected section |
|------|-------|-----|------------------|
| Ends today | yesterday | today | 今天截止 |
| Spans day | before today | after today | 正在进行 |
| Starts today | today | tomorrow | 今天开始 |
| Starts and ends today | today | today | 今天截止 only |
| Unrelated | another date | another date | hidden |
| Unscheduled | null | null | hidden |

Expected:
- 三章顺序固定
- 每张相关卡恰好出现一次
- 同日始终卡不在“今天开始”重复
- 时区边界使用 owner preference
- 未安排仍只进入全部视图
- 20 张边界数据的归类正确率 100%，重复和遗漏均为 0

## V7 — Independent scrolling

1. 为同一日准备足以溢出左上区域的卡片。
2. 在日报中输入可识别内容。
3. 滚动左上三个章节。

Expected:
- 只有章节区滚动
- 日报与右侧坐标图位置不移动
- 顶/底渐隐只在对应方向仍可滚动时出现
- 渐隐不拦截卡片点击、完成或拖拽
- 窄屏三块内容均可达

## V8 — Priority slider and form layout

1. 打开创建表单和详情编辑表单。
2. 用鼠标、键盘方向键、Home/End 和触摸逐项选择 0～10。
3. 查看只读详情和坐标图。

Expected:
- 旧竖向数字列不再出现
- 11 个整数均可准确选择，不产生小数
- 拖动气泡显示当前值
- 色条由淡到浓，数字仍可感知
- 只读继续使用 PriorityMeter
- 坐标位置与 importance/urgency 数值一致
- 时间同行、优先级同行、分类/stage 同行、描述区增高
- Modal 外部尺寸不变

## V9 — Card visual composition and overdue

1. 准备同时具有分类、stage、完成框的卡片。
2. 在日视图和全部视图 hover。
3. 在全部视图加入已过期 active scheduled、未来 scheduled、unscheduled 卡。
4. 切换明暗主题。

Expected:
- 分类色带在左缘、stage 在角标、hover 条在顶边、checkbox 可独立点击
- 元素不重叠、不遮挡标题和操作
- hover 条不承载点击
- 只有已过期 active scheduled 卡在全部视图泛红
- 日/周/月不应用过期红底

## V10 — Motion and defect fixes

逐项检查：
- segmented control 使用单一选中 indicator 在选项间连续滑动，而不是按钮背景分别淡入淡出
- 列表交错淡入
- 坐标聚合圆 hover 与可用时的卡片联动
- 主题切换
- Modal/Drawer 打开关闭
- EmptyState 呼吸
- 日报编辑强调
- ConfirmDialog 危险语义
- 从 CardGrid 与周/月 SpanBar 拖拽进垃圾箱时都有可辨认拖影
- 日/周/月 ViewTimeNav hover

Expected:
- 常态动效约 150～250ms，不卡住操作
- ViewTimeNav 上浮后完整可见
- 删除/永久删除确认危险语义突出，取消仍可发现
- 垃圾箱有拖影、目标高亮与接收反馈，业务语义不变

启用系统“减少动态效果”后重做：
- 非必要位移、缩放、呼吸、stagger 被取消或近即时
- 所有状态与操作仍可辨认

## V11 — Multi-device refresh

1. 设备 A、B 使用同一所有者会话并同时保持页面前台可见。
2. 在设备 A 依次修改 stage、日报并删除分类；每次记录设备 B 出现更新的时刻。
3. 设备 B 再切到后台；设备 A 做一次修改后，让设备 B 恢复可见。

Expected:
- 两台都在前台时，cards stage、categories 删除、当前 daily report 均在 3 秒内更新
- 设备 B 恢复可见时立即发起刷新，不等待下一个 3 秒周期
- 不需要刷新整页

## V12 — 001～006 regression

至少执行：

- 四字符验证码登录、退出和未授权保护
- 创建/编辑卡片；仅标题必填；标题不可重名
- 已安排起止合法；未安排仅在全部视图
- 搜索、日/周/月/全部导航与锚定日期
- 卡片完成、删除、恢复、永久删除
- 日/全部优先级坐标图取数和点位
- 拖拽卡片进垃圾箱
- 分类、重要度、紧急度、安排状态既有筛选
- 明暗主题、AI 纯文本对话、响应式布局

Expected:
- 既有行为 100% 通过
- AI 不操作日报、分类或日程
- 后端业务改动只集中于日报、分类、stage

## Completion commands

```bash
npm run build
DATABASE_PATH=/tmp/watson-007-final.db npm run db:migrate
git diff --check
```

全部 V0～V12 通过后，才进入发布或实现完成状态。
