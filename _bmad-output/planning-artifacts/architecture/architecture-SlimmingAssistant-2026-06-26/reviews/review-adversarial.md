# Reviewer Gate — 架构空洞攻击检查

## Verdict

通过，已修补一个数据不变量空洞。当前 AD 能约束下一级故事独立实现时最容易漂移的边界。

## Attack Scenarios

### Scenario 1: 记录模块和首页模块分别解释“今日健康记录”

- **Risk:** 记录模块允许同日多条健康记录，首页模块只取最新一条，历史模块又展示全部，导致覆盖规则不一致。
- **Fix:** 新增 AD-9，规定 `healthRecord` 对 `localDate` 唯一，`runRecord` 同日可多条。

### Scenario 2: 设置页保存 SMTP，但提醒运行器读取环境变量

- **Risk:** 用户在中文设置页修改 SMTP 后，邮件提醒仍按旧配置发送。
- **Coverage:** AD-6 规定用户可配置项全部进入 typed settings model；AD-5 规定 ReminderRunner 从 SQLite 读取提醒设置。

### Scenario 3: 趋势页存储预计达成时间，记录编辑后不刷新

- **Risk:** 修改历史记录后首页还显示旧预计达成时间。
- **Coverage:** AD-3 规定 BMI、趋势、目标进度、预计达成时间都是 read-model/service 派生值，不是权威事实。

### Scenario 4: 开发者引入 NextAuth 或注册页面

- **Risk:** 个人项目被实现成账号系统，增加不必要复杂度。
- **Coverage:** AD-4 固定访问保护是访问密码 + 受信设备，不是账号系统。

## Residual Risk

若未来部署为多进程或容器副本，AD-5/AD-8 需要升级为带分布式锁或外部 scheduler 的提醒架构。当前 MVP 明确是单长运行 Node 进程。

