# Watson — 视觉设计系统 (DESIGN.md)

> **代号：MISSION CONTROL**
> 从资深美术主管视角，把 Watson 从「功能完善但朴素」重塑为产品级的**任务控制台 (Mission Control)** 界面。
>
> 参考：**NASA 任务控制台**（结构主体）× **SpaceX**（冷峻克制的气质）× **NVIDIA**（招牌荧光绿，仅用于关键状态）。

---

## 0. 铁律（不可违反）

1. **不改功能逻辑**：任何 `.ts`/`.tsx` 的业务逻辑、事件处理、数据流、状态管理一律不动。
2. **不改空间排布**：顶栏 + 主视图区 + 侧边聊天栏的整体骨架、栅格、各视图布局结构保持不变。
3. **只改视觉层**：CSS 变量 / className / 颜色 / 字体 / 边框 / 阴影 / 材质 / 动效 / 装饰元素。
4. **只做深色**：默认强制深色控制台主题。亮色主题不投入精力（保留可用即可）。
5. **绿色克制**：NVIDIA 绿只用于**关键状态**（激活/选中/成功/数据高亮），不做大面积背景。主体是冷峻的深空黑 + 石墨灰 + 冷白文字。

---

## 1. 色板 (Palette)

### 深空基底 (Deep Space Neutrals)
| 变量 | 值 | 用途 |
|---|---|---|
| `--bg` | `#05070a` | 最底层深空黑 |
| `--bg-raised` | `#0a0e14` | 略抬升的区块底 |
| `--panel` | `#0f141b` | 面板/卡片底 |
| `--panel-raised` | `#151b24` | 悬浮/激活面板 |
| `--border` | `#1e2733` | 常规描边（冷石墨） |
| `--border-strong` | `#2c3949` | 强描边/分隔 |
| `--grid-line` | `rgba(120,150,180,0.06)` | 遥测网格线 |

### 文字 (Cool White Ink)
| 变量 | 值 | 用途 |
|---|---|---|
| `--fg-strong` | `#f0f4f8` | 标题/强调 |
| `--fg` | `#c4ccd6` | 正文 |
| `--muted` | `#6b7684` | 次要/说明 |
| `--muted-dim` | `#4a535f` | 最弱/占位 |

### 招牌强调 — NVIDIA 绿（仅关键状态）
| 变量 | 值 | 用途 |
|---|---|---|
| `--accent` | `#76b900` | 激活/选中/主按钮/数据高亮 |
| `--accent-bright` | `#8ed600` | hover 提亮 |
| `--accent-dim` | `#5a8c00` | active 压暗 |
| `--accent-subtle` | `rgba(118,185,0,0.12)` | 强调背景铺底 |
| `--accent-glow` | `rgba(118,185,0,0.35)` | 辉光/聚焦环 |

### 遥测状态色 (Telemetry — 冷调，低饱和)
| 变量 | 值 | 用途 |
|---|---|---|
| `--tele-nominal` | `#76b900` | 正常（复用 accent 绿） |
| `--tele-caution` | `#f5a623` | 注意（琥珀） |
| `--tele-critical` | `#ff453a` | 危急/逾期（红） |
| `--tele-info` | `#3d9be9` | 信息（冰蓝） |

四象限（重要×紧急）用遥测色低透明度铺底：Q1 critical / Q2 caution / Q3 info / Q4 nominal。

---

## 2. 字体 (Typography)

- **数据/标题/标签/导航 → JetBrains Mono**（本地 `public/fonts/`，字重 400/500/700）。等宽技术字，给控制台的遥测硬朗感。全大写 + `letter-spacing` 用于 eyebrow/状态标签。
- **正文/描述/长文本 → 无衬线系统栈**：`ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif`。
- 变量：
  - `--font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;`
  - `--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`
- 字号沿用现有 `--text-xs ~ --text-2xl` 阶梯，不改数值（保排布稳定）。

---

## 3. 材质与描边 (Surface)

- 面板：`--panel` 底 + `1px solid --border`，圆角沿用现有 `--radius-*`（不改，保排布）。
- **微网格纹理**：主视图区背景叠加极淡的遥测网格（`--grid-line` 画的 40px 栅格），呼应控制台。
- **玻璃拟态顶栏**：沿用现有 `backdrop-filter: blur`，底色换成 `color-mix(--panel 72%, transparent)`。
- 阴影：深色下弱化投影、改为**边缘辉光**表达层级（关键元素用 `--accent-glow` 聚焦环）。

---

## 4. 动效 (Motion)

- 沿用现有缓动 `--ease-standard` 与 `--duration-*`。
- 新增克制的控制台微动效：
  - 关键按钮/激活态：绿色辉光呼吸（低频、低幅）。
  - 聚焦环：`0 0 0 2px --accent-glow`。
  - 数据出现：沿用现有 `card-enter`，不加花哨。
- 尊重 `prefers-reduced-motion`（现有已处理，保留）。

---

## 5. 施工顺序

1. `index.css` token 层：`:root`/`.dark` 变量 + 字体 `@font-face` + 网格工具类。
2. 强制默认深色（`useTheme` / `<html>` 类）。
3. 登录页 → 任务控制台启动界面（骨架已就绪，做视觉）。
4. TopBar / 分段控件 / 按钮 / 导航。
5. 日程卡片 / 徽章 / 优先级 / 四象限。
6. SpaceBackdrop 深空背景强化 + 全局网格。
7. `npm run build` 双端验证 + 逐屏截图核对。

---

## 6. 验收标准

- 双端 `npm run build` 通过（TS 无新增错误）。
- 功能与排布零改动（对照施工前行为）。
- 深色下：深空黑基底、冷白文字、绿色仅见于关键状态、等宽字用于数据/标签、主视图有微网格遥测感。
- 整体观感：冷峻、硬核、克制、产品级 —— 像一块真正的任务控制台屏幕。
