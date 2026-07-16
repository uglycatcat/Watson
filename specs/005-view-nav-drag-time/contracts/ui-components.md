# UI Components: 005 契约

**Feature**: `005-view-nav-drag-time`  
**Date**: 2026-07-16

---

## LoginPage

- 底部备案占位：固定/最小高度区域；可空或中性「备案信息预留」
- 明暗主题下不破坏验证码主视觉

---

## AnchorDateControl（TopBar）

- 受控日期，**不可清空**
- 按钮「回到今天」
- 显示条件：`view !== "trash"`（**含 all**）
- all 下变更不驱动 AllView 过滤

---

## ViewTimeNav

| 视图 | 文案示例 |
|------|----------|
| 日 | 前一天 / 今天 / 后一天 |
| 周 | 上一周 / 本周 / 下一周 |
| 月 | 上一月 / 本月 / 下一月 |

统一写 `anchorDate` via `onDateChange`。

---

## DayView

- 左：ViewTimeNav + 日程网格（可拖）
- 右：凹陷圆角方框内 **常驻** QuadrantView（embedded）
- **无**「坐标视图」按钮

---

## AllView

- 坐标仍按钮 → overlay QuadrantView
- 不消费 anchorDate 过滤

---

## Drag → Trash

| 来源 | draggable |
|------|-----------|
| CardGrid 卡片 | ✅ |
| 周/月日内芯片 | ✅ |
| SpanBar | ✅ |
| 搜索候选 | ❌ |
| 垃圾箱内 | ❌ |

- TopBar 垃圾箱图标：drop target；dragover 可高亮
- drop → `deleteCard(id)`，无 ConfirmDialog
- 详情「删除」：仍 ConfirmDialog
- 触摸设备：不强制拖拽；可用详情删除

---

## CardFormFields

- 结束输入 **不**因无开始而 disabled
- 只填结束合法；提交时补开始
- 填开始自动补结束 +24h（规则见澄清）
- 不可最终保存「有开始无结束」

---

## SpanBar / WeekView / MonthView

- 长条高度约 ×2.5；顶端略下移；条间距对齐
- 周框与月底上收留白（容器 padding/高度）

---

## QuadrantView

- 新 prop 如 `variant: "overlay" | "embedded"`
- embedded：无遮罩关闭逻辑；填满父方框
