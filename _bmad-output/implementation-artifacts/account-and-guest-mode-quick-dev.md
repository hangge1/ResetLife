# 账户隔离与访客模式 Quick Dev 规格

## 背景

原架构 AD-4 将访问保护定义为“访问密码 + 受信设备”，不是账号系统。当前需求要求：

- 每个真实使用者拥有自己的账号。
- 个人健康、跑步、目标、设置、提醒数据相互隔离。
- 不引入复杂数据库，继续使用本地 SQLite。
- 支持访客临时体验，访客数据不写入 SQLite。

## 方案

采用“单 SQLite + 轻量 users/sessions + user_id 数据归属 + 内存访客沙盒”。

### 真实用户

- 新增 `users` 表保存账号、角色和密码哈希。
- 新增 `user_sessions` 表保存登录态 token hash。
- 第一个创建的用户自动为 `admin`。
- 已有访问密码部署升级时自动生成 `default-admin/admin`，密码沿用旧访问密码哈希。
- 业务表增加 `user_id`：
  - `health_records`
  - `run_records`
  - `goals`
  - `settings`
  - `reminder_events`
  - `trusted_devices`
- repository 默认使用 `default-admin` 兼容旧测试和旧代码，但页面/action 必须通过 auth-scoped repository 传入当前用户。

### 访客

- 访客不创建 `users` 记录。
- 访客入口只写短期 `slimming_guest_session` httpOnly cookie。
- 访客数据保存在进程内 Map，按 guest session id 隔离。
- 访客可体验首页、目标、打卡、历史、数据看板。
- 访客不能进入设置、SMTP、访问保护、用户管理等真实账号能力。
- 访客数据在 cookie 过期、服务重启或内存清理后消失。

## 当前实现边界

本轮实现账户/session 基础、核心业务表 `user_id`、真实用户/访客 repository 分流、主流程页面和 action 的接入。

后续仍需补齐：

- 管理员创建/禁用普通用户 UI。
- 登出入口。
- 更完整的用户管理测试。
- 受信设备面板文案从“访问保护”调整为“账号安全”。

## 风险控制

- 所有真实业务写入必须经过 `requireAuthContext()` 或 `requireUserAuthContext()`。
- 所有核心数据 repository 必须使用 userId 查询条件。
- 访客 repository 不得引用 SQLite。
- 设置、邮件提醒规则、个人资料和趋势阈值按 userId 隔离。
- SMTP 发信配置是系统级配置，固定使用 `default-admin` 归属，只允许 `admin` 角色维护；普通用户只维护个人资料里的提醒收件邮箱。
- 邮件提醒发送时，个人提醒规则和收件邮箱来自当前用户 settings repository，SMTP 发信参数来自全局 settings repository。
- 设置、SMTP、邮件测试和访问保护必须拒绝访客；SMTP 保存、清空和测试必须额外校验 `auth.role === "admin"`。
