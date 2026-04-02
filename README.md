# Watson

浏览器端日程月历：数据以仓库内 **`public/data/watson_schedules.json`** 为源，通过 **`npm run preview`** 本地预览并写回磁盘；纯静态部署时无服务端写盘，需导出/导入 JSON。

## 功能概要

- 月视图、优先级色条、收件箱与拖拽、表单（未定日期 / 无时段 / 时段）
- 左下角齿轮：导出备份、从 JSON 导入
- `localStorage` 仅作镜像；能成功请求 `/data/watson_schedules.json` 时，还会在 preview 下 POST 写回 `dist` 与 `public`

## 技术栈

React 18、TypeScript、Vite 5、Tailwind CSS 3、Zustand、dayjs。

## 使用方式

```bash
npm install
npm run preview
```

该命令会先 **`vite build`** 再 **`vite preview`**。在浏览器中打开终端提示的地址即可；修改日程后，JSON 会更新到 **`dist/data/`** 与 **`public/data/`**，便于 `git` 提交。

若已构建且只想快速起预览服务（不重新 build）：

```bash
npx vite preview
```

此时若 `dist` 过旧，请先执行 `npm run build`。

如需改 UI 时用 Vite 热更新，可运行 `npx vite`（开发服务器**不会**注册写 JSON 的中间件，日程仅进浏览器缓存，与正式流程无关）。

## 部署说明

静态托管（如 Nginx、GitHub Pages）**没有**本项目的 `POST /__watson/save-schedules`，页面仍可读 JSON，但**无法自动写盘**；请用齿轮中的导出/导入，或日后接自有后端。

更细的产品说明见 `watson_design.md`。
