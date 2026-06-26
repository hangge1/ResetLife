---
id: SPEC-slimming-assistant
companions:
  - glossary.md
  - architecture-diagrams.md
  - ../planning-artifacts/ux-designs/ux-SlimmingAssistant-2026-06-25/DESIGN.md
  - ../planning-artifacts/ux-designs/ux-SlimmingAssistant-2026-06-25/EXPERIENCE.md
  - ../planning-artifacts/architecture/architecture-SlimmingAssistant-2026-06-26/ARCHITECTURE-SPINE.md
sources:
  - ../planning-artifacts/prds/prd-SlimmingAssistant-2026-06-25/prd.md
---

> **Canonical contract.** 本 SPEC 与 `companions:` 中的文件共同构成下游设计、实现、测试和验收的完整契约。

# 瘦身助手 SPEC

## Why

瘦身助手解决个人减脂坚持中的记录分散、反馈不足和容易中断问题。它让单个用户用中文 Web 应用集中记录健康与跑步数据，看到目标差距和趋势，并通过提醒降低忘记运动或忘记记录的概率。

## Capabilities

- **CAP-1**
  - **intent:** 用户可以创建或更新每日健康记录，并添加跑步记录，以便把健康和运动数据集中记录。
  - **success:** 同日健康记录会覆盖；同日跑步记录可多条；保存、编辑或删除后首页、趋势和目标进度重新计算。

- **CAP-2**
  - **intent:** 用户可以设置健康目标和每周跑步目标，以便每次查看都有明确参照。
  - **success:** 首页展示当前值、目标值、剩余差距和目标状态；未设置的目标不显示误导性进度。

- **CAP-3**
  - **intent:** 系统可以用中文首页展示今日状态、健康趋势、跑步趋势、BMI、目标进度、预计达成时间和基于数据的鼓励。
  - **success:** 用户无需打开原始表格即可理解最近 7 天和 30 天的进展；数据不足或趋势反向时不显示虚假预计日期。

- **CAP-4**
  - **intent:** 用户可以配置站内提醒和 SMTP 邮件提醒，以便缺少运动或记录时得到提示。
  - **success:** 站内提醒和邮件提醒使用同一提醒资格规则；同一 `localDate + reminderType + channel` 不重复生成提醒。

- **CAP-5**
  - **intent:** 用户可以在设置中管理个人资料、SMTP、趋势估算阈值、访问密码和受信设备。
  - **success:** 设置变更立即影响提醒、趋势估算和访问保护，不需要修改代码或环境变量。

- **CAP-6**
  - **intent:** 系统可以用访问密码和受信浏览器设备标识保护个人健康数据，而不引入账号系统。
  - **success:** 未受信浏览器不能读取或写入个人数据；受信浏览器后续访问无需重复输入密码。

- **CAP-7**
  - **intent:** 用户可以浏览、筛选、编辑和删除历史健康记录与跑步记录。
  - **success:** 修改历史记录后，趋势、目标进度和今日状态都反映最新源事实。

## Constraints

- 可见产品名为“瘦身助手”，界面文案使用中文，视觉和交互遵守 UX companions。
- 架构遵守 `ARCHITECTURE-SPINE.md`：模块化单体、长运行 Node 进程、本地 SQLite、Drizzle repository、派生 read-model、单一 ReminderRunner。
- 数据不变量固定：每日一条健康记录；同日可有多条跑步记录；提醒事件按 `localDate + reminderType + channel` 幂等；设置为 typed singleton；访问密码哈希和受信设备服务端保存。
- SMTP 密码或授权码、访问密码不得在界面明文回显；访问密码不得明文保存。
- 图表和进度不得只依赖颜色表达含义，必须有中文文字摘要或标签。

## Non-goals

- 不做多人账号、公开注册、社交、排行榜或好友监督。
- 不做手表、跑步 App、体脂秤、截图或文件自动导入。
- 不做短信、微信、QQ 推送。
- 不做 AI 健身教练、训练处方、饮食处方、医疗诊断或疾病管理。
- 不把 MVP 部署到无持久磁盘或无常驻进程的 serverless/edge 环境。

## Success signal

用户可以连续 30 天用瘦身助手替代表格或零散笔记：一次健康和跑步记录主路径能在 1 分钟内完成，首页能诚实展示目标差距、趋势、预计达成情况和提醒状态。

