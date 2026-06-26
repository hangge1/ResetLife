# AGENT.md

本文件给后续 AI 代理和开发者使用。项目对外沟通和页面文案默认使用中文。

## 项目概览

SlimmingAssistant 是一个个人使用的瘦身助手 Web 应用。第一版只支持手动录入，不接自动健康数据源，不做多人账号体系。

核心能力：

- 设备信任 + 本地访问密码保护。
- 每日健康记录，重复提交覆盖当天记录。
- 跑步记录，同日可多条。
- 历史筛选、补录、编辑、删除。
- 健康目标与跑步目标。
- 首页健康/运动曲线、目标进度、趋势估算、BMI、鼓励文案。
- 配置中心、站内提醒、SMTP 邮件提醒。

## 技术栈

- Next.js App Router
- React
- TypeScript
- SQLite
- Drizzle ORM
- Tailwind CSS
- Node test runner
- Playwright，用于本地 UI 截图

## 常用命令

```bash
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run ui:screenshot
npm run db:migrate
```

`npm run ui:screenshot` 会使用临时 SQLite 数据库，不污染真实本地数据。截图输出在 `.ui-screenshots/<timestamp>/`。

## 目录结构

- `app/`：Next.js 路由页面和全局样式。
- `components/`：通用布局和 UI 组件。
- `features/access/`：访问密码、设备 token、受信设备。
- `features/records/`：健康记录、跑步记录、历史记录。
- `features/goals/`：健康目标和跑步目标。
- `features/dashboard/`：首页摘要、曲线、目标进度。
- `features/settings/`：配置中心、个人资料、提醒、SMTP。
- `features/reminders/`：提醒事件与提醒 runner。
- `db/`：Drizzle schema、SQLite client、迁移文件。
- `scripts/`：迁移脚本、UI 截图脚本。
- `tests/`：Node test runner 测试。
- `doc/`：需求和开发日志。
- `_bmad-output/`：BMad 规划和 story 执行记录。

## 开发约束

- 页面、表单、错误信息和用户可见文案必须使用中文。
- 第一版按单用户本地部署设计，不引入多人账号体系。
- 不直接在页面或 action 中操作数据库，优先经过 repository/service。
- 访问保护相关数据不能保存明文密码或明文设备 token。
- 跑步配速是只读计算值，由运动时长 / 公里数得到，不允许用户手动覆盖。
- 首页是工具界面，不做营销型 landing page。
- 桌面端主内容应使用可用宽度，避免固定窄容器造成右侧大面积空白。
- 曲线区域优先保持信息密度可控：单图展示，通过下拉切换指标。
- 运行产物不要提交：`.next/`、`.next-dev-logs/`、`.ui-screenshots/`、`data/`、`.agents/`。

## 验证要求

提交前至少运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

涉及 UI 布局或视觉调整时还要运行：

```bash
npm run ui:screenshot
```

然后检查 `wide-首页.png`、`desktop-首页.png`、`mobile-首页.png`。如果改动影响其他页面，也检查对应页面截图。

## Git 约定

- 默认提交到 `main`。
- 第一个版本提交使用 `feat: initial slimming assistant app`。
- 不提交本地截图、日志、SQLite 数据文件、node_modules。
- 如果工作树出现与当前任务无关的用户改动，不要回滚，先确认改动来源和影响。

