---
baseline_commit: 71289d6a95b7748d9e2ab430303ccf3a9f7fed42
---

# Story 4.5: 配置 SMTP 并发送测试邮件

Status: done

## Story

As a 个人用户,
I want 在配置界面维护 SMTP 参数并发送测试邮件,
so that 我可以确认邮件提醒可以送达。

## Acceptance Criteria

1. Given 用户在设置页面打开 SMTP 配置, when 用户填写 SMTP 主机、端口、账号、密码或授权码、发件人地址和安全模式并保存, then 系统保存 SMTP 配置。
2. 安全模式支持 None、SSL、STARTTLS。
3. SMTP 密码或授权码不会在配置界面明文回显。
4. 用户可以发送测试邮件。
5. 测试邮件发送成功时显示中文成功提示。
6. 测试邮件发送失败时显示中文失败提示并保留可诊断状态。
7. 清空 SMTP 配置前需要中文确认提示。

## Tasks / Subtasks

- [x] 建立 SMTP 输入解析、settings service 和测试。
- [x] 建立 SMTP 保存 action 和设置页表单。
- [x] 建立测试邮件 service 和 action。
- [x] 表单不回显 SMTP 密码或授权码。
- [x] 完成验证。

## Dev Notes

- SMTP 配置保存到 settings: `type=smtp`, `key=config`。
- 测试邮件使用 Nodemailer；测试通过注入 transport 避免真实发送。
- 失败状态以 settings 保存最近一次测试结果，供后续页面读取。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `node --test tests\smtp-settings.test.mjs`（RED：缺少 SMTP service，预期失败）
- `node --test tests\smtp-settings.test.mjs`
- `npm test`
- `npm run typecheck`（首次发现安全模式类型收窄问题，已修复）
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

### Completion Notes List

- 新增 Nodemailer 依赖和类型依赖。
- 新增 SMTP 配置输入解析、settings service、保存 action 和设置页表单。
- SMTP 密码保存后不回显，留空保存时保留原密码。
- 新增测试邮件服务和 action，测试可注入 transport，成功/失败都会记录最近测试状态。
- 新增清空 SMTP 配置按钮，执行前有中文确认提示。

### File List

- `package.json`
- `package-lock.json`
- `app/settings/page.tsx`
- `features/settings/actions/clear-smtp-config.ts`
- `features/settings/actions/save-smtp-config.ts`
- `features/settings/actions/send-test-email-state.ts`
- `features/settings/actions/send-test-email.ts`
- `features/settings/actions/smtp-config-form-state.ts`
- `features/settings/components/smtp-config-form.tsx`
- `features/settings/services/smtp-config-input.ts`
- `features/settings/services/smtp-config-service.ts`
- `features/settings/services/test-email-service.ts`
- `tests/app-shell.test.mjs`
- `tests/smtp-settings.test.mjs`
- `_bmad-output/implementation-artifacts/4-5-配置-SMTP-并发送测试邮件.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

- No blocking findings after self-review.

### Change Log

- 2026-06-26: Created Story 4.5 implementation context and started development.
- 2026-06-26: Implemented Story 4.5 SMTP config form, settings service, test email action/service and tests; marked done.
