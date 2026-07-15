# 个人站与 Go 后端改造方案

## 1. 目标

当前仓库的首页是跑步瘦身助手的应用仪表盘。新的产品方向是把站点升级为个人 Web 站点，首页展示个人内容与作品，跑步瘦身助手只作为项目板块中的一个项目，并保留为可进入的独立应用。

本次改造同时调整技术栈：

- 前端从 Next.js 全栈应用迁移到 Astro + Vue。
- 后端从 Node/Next Server Actions 迁移到 Go API。
- 生产部署依托宝塔面板，使用 Nginx 托管静态文件并反向代理 Go 服务。

核心原则：

- 个人站公开可访问，不依赖登录和数据库。
- 跑步瘦身助手保留登录保护和私有数据边界。
- 前端只负责页面与交互，不直接操作数据库。
- Go 后端承担鉴权、业务 API、后台提醒任务和数据持久化。
- 宝塔用于域名、SSL、Nginx、日志、进程与资源监控。

## 2. 推荐技术栈

### 2.1 前端

```text
Astro
Vue 3
TypeScript
CSS Modules 或普通 CSS
少量图表库，按需引入
```

Astro 负责个人站、文章、项目展示、静态页面生成。Vue 负责跑步瘦身助手这类需要状态管理、表单和图表的交互界面。

### 2.2 后端

```text
Go
chi 或标准 net/http
SQLite 起步
后续预留 PostgreSQL
cookie session 鉴权
后台 goroutine/cron 处理提醒任务
```

Go 服务只监听内网地址，例如 `127.0.0.1:8080`，公网访问全部经过宝塔 Nginx。

### 2.3 部署

```text
宝塔 Nginx
systemd 或 Supervisor 管理 Go 服务
静态前端文件由 Nginx 直接托管
/api/* 反向代理到 Go 服务
```

## 3. 路由规划

### 3.1 公网站点

```text
/                         个人站首页
/cognition                认知板块
/cognition/[slug]         认知文章详情
/tech                     技术板块
/tech/[slug]              技术文章详情
/projects                 项目板块
/projects/slimming        跑步瘦身助手项目介绍
```

### 3.2 跑步瘦身助手应用

```text
/app/slimming             应用首页/仪表盘
/app/slimming/records     今日打卡
/app/slimming/data        数据分析
/app/slimming/history     历史记录
/app/slimming/goals       目标计划
/app/slimming/settings    设置
```

### 3.3 后端 API

```text
/api/healthz
/api/auth/login
/api/auth/logout
/api/auth/session
/api/slimming/summary
/api/slimming/records/health
/api/slimming/records/runs
/api/slimming/goals/health
/api/slimming/goals/run
/api/slimming/history
/api/slimming/settings
/api/slimming/reminders
```

## 4. 目录结构建议

迁移完成后的目标结构：

```text
web/
  package.json
  astro.config.mjs
  tsconfig.json
  src/
    pages/
      index.astro
      cognition/
      tech/
      projects/
      app/
        slimming/
    components/
      site/
      slimming/
    content/
      cognition/
      tech/
      projects/
    styles/

server/
  go.mod
  cmd/
    api/
      main.go
  internal/
    config/
    httpserver/
    auth/
    users/
    slimming/
      dashboard/
      records/
      goals/
      history/
      reminders/
      settings/
    storage/
    mailer/
  migrations/

deploy/
  nginx/
  systemd/
  scripts/

doc/
  personal-site-go-architecture.md
```

过渡期可以保留当前 `app/`、`components/`、`features/`、`db/` 和 `scripts/`，待新前后端稳定后再删除或归档。

## 5. 内容模型

### 5.1 认知板块

用于承载长期思考、读书笔记、方法论、AI 使用心得、产品判断等。

建议字段：

```text
title
description
date
tags
slug
body
```

### 5.2 技术板块

用于承载工程实践、技术笔记、部署记录、架构复盘、踩坑文档。

建议分类：

```text
前端
后端
AI
部署
工程工具
```

### 5.3 项目板块

跑步瘦身助手只是其中一个项目 item。每个项目建议包含：

```text
名称
一句话定位
解决的问题
核心功能
技术栈
当前状态
项目详情链接
应用入口链接
```

## 6. Go 后端边界

### 6.1 鉴权

第一版沿用轻量账号体系：

- 管理员维护用户。
- 普通用户数据隔离。
- 访客模式只用于临时体验。
- Cookie session 保存登录态。
- 密码和设备 token 必须哈希保存。

### 6.2 跑步瘦身助手 API

Go 后端需要覆盖当前 Next 服务端逻辑：

- 登录、退出、当前会话。
- 健康记录 CRUD。
- 跑步记录 CRUD。
- 历史筛选与编辑。
- 健康目标与跑步目标。
- 首页摘要。
- 趋势估算。
- 设置与提醒配置。
- SMTP 邮件提醒。

### 6.3 数据库

第一阶段可以继续 SQLite：

```text
/www/wwwroot/personal-site-data/app.sqlite
```

如果未来公开多人使用或写入压力增大，再迁移 PostgreSQL。Go 代码中需要把存储层隔离在 `internal/storage`，避免业务逻辑绑定具体数据库。

## 7. 宝塔部署方案

### 7.1 服务器目录

```text
/www/wwwroot/personal-site/
  releases/
    20260715-xxxx/
      web/
      api/
  current -> releases/20260715-xxxx

/www/wwwroot/personal-site-data/
  app.sqlite
  uploads/
  logs/
```

### 7.2 Nginx 反向代理

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8080/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
  root /www/wwwroot/personal-site/current/web;
  try_files $uri $uri/ /index.html;
}
```

### 7.3 Go 服务

Go 服务建议由 systemd 或 Supervisor 管理。宝塔负责查看进程、日志和资源状态。

服务约定：

```text
监听地址：127.0.0.1:8080
健康检查：GET /healthz
数据目录：/www/wwwroot/personal-site-data
日志目录：/www/wwwroot/personal-site-data/logs
```

### 7.4 发布流程

```text
1. 本地构建 Astro 静态文件。
2. 本地交叉编译 Linux Go 二进制。
3. 打包 web/ 与 api/。
4. 上传到服务器 releases/新版本目录。
5. 切换 current 软链接。
6. 重启 Go 服务。
7. reload Nginx。
8. 请求 /api/healthz 和首页做验证。
9. 保留最近若干版本，清理旧 release。
```

## 8. 迁移阶段

### 阶段 1：信息架构改造

目标：

- 新建公开个人站首页。
- 首页包含认知、技术、项目三个板块。
- 跑步瘦身助手作为项目 item 出现在项目板块。
- 当前跑步助手首页迁移到 `/app/slimming`。

这一阶段可以先在现有 Next 项目中完成，以降低一次性迁移风险。

### 阶段 2：Astro + Vue 前端骨架

目标：

- 建立 `web/` 目录。
- 用 Astro 实现个人站静态页面。
- 用 Vue 实现跑步助手前端应用壳。
- 前端通过 `/api/*` 调用后端，不再使用 Next Server Actions。

当前状态：

- 已建立 `web/` Astro + Vue 静态前端骨架。
- 已建立 `/`、`/projects/slimming/`、`/app/slimming/` 三个静态页面。
- 已建立 `server/` Go API 骨架，当前提供 `/healthz` 和 `/api/healthz`。
- 本机已安装 Go 1.26.5 到用户目录，Go API 骨架已通过 `go test ./...` 和 `/healthz` 运行验证。
- 已新增 `/api/version` 和 `/api/auth/session`，Vue 应用壳已开始调用 session API。
- Go 侧已建立 auth resolver、session token hash、内存 repository、SQLite repository 和单元测试。
- SQLite 驱动使用 `modernc.org/sqlite`，当前通过 `goproxy.cn` 下载成功；本机 Go 环境的用户级 `GOPROXY` 已调整为 `https://goproxy.cn,direct`。
- `/api/auth/session` 已能通过 SQLite `users` / `user_sessions` 表解析真实 session；后续需要迁移登录创建 session 的写入流程。

### 阶段 3：Go API MVP

目标：

- 建立 `server/` 目录。
- 实现 `/api/healthz`。
- 实现登录、退出、当前会话。
- 实现健康记录、跑步记录、目标的基础 CRUD。
- 保留 SQLite 数据。

### 阶段 4：业务迁移

目标：

- 将当前 `features/dashboard`、`features/records`、`features/goals`、`features/settings` 的服务端规则迁移到 Go。
- 前端页面逐步从 Next 页面切换到 Astro/Vue 页面。
- 保持旧路由 redirect 到新路由，减少链接失效。

### 阶段 5：宝塔部署重构

目标：

- 废弃 Node 项目部署方式。
- 改为静态前端 + Go 服务。
- 新增部署脚本、Nginx 模板、systemd/Supervisor 模板。
- 宝塔负责域名、SSL、Nginx、日志和进程监控。

### 阶段 6：清理 Next 遗留

目标：

- 确认新前后端功能完整。
- 删除或归档 Next.js App Router 代码。
- 更新 README、AGENT.md 和部署文档。
- 更新测试与截图流程。

## 9. 风险与约束

- 不要一次性删除现有 Next 应用，先并行迁移。
- 跑步助手现有业务规则较多，迁移时必须逐个对照服务和测试。
- SQLite 适合个人或小规模使用，高并发公开访问前需要评估 PostgreSQL。
- 宝塔启动命令不能执行构建、安装依赖或迁移大任务。
- 服务器凭据、私钥、面板 token 不得写入仓库。
- 前端静态化后，所有敏感判断必须在 Go 后端完成。

## 10. 下一步

建议先执行阶段 1，完成信息架构改造：

```text
/                  新个人站首页
/app/slimming      旧跑步助手首页
/projects/slimming 跑步助手项目介绍
```

阶段 1 完成后，再开始搭建 `web/` 和 `server/` 的新技术栈骨架。
