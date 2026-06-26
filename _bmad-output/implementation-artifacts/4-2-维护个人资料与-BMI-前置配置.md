---
baseline_commit: 71289d6a95b7748d9e2ab430303ccf3a9f7fed42
---

# Story 4.2: 维护个人资料与 BMI 前置配置

Status: done

## Story

As a 个人用户,
I want 设置昵称、身高和提醒收件邮箱,
so that 首页可以显示 BMI，邮件提醒也有收件地址。

## Acceptance Criteria

1. Given 用户在受信浏览器进入“设置”页面, when 用户填写昵称、身高和提醒收件邮箱并保存, then 系统保存个人资料设置。
2. 身高使用厘米作为界面单位。
3. 身高缺失时 BMI 不计算并显示中文提示。
4. 邮箱格式非法时在字段旁显示中文错误。
5. 保存成功后首页和健康趋势可读取身高计算 BMI。
6. 保存成功后邮件提醒可读取收件邮箱。

## Tasks / Subtasks

- [x] 建立个人资料输入解析与测试（AC: 1-4）
- [x] 建立个人资料 settings service（AC: 1, 5-6）
- [x] 建立保存个人资料的 server action（AC: 1, 4）
- [x] 实现设置页个人资料表单（AC: 1-4）
- [x] 首页 BMI 接入已保存身高（AC: 3, 5）
- [x] 完成验证
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm run lint`。
  - [x] 运行 `npm run build`。

## Dev Notes

- 个人资料保存到 settings: `type=profile`, `key=basic`。
- SMTP 发送逻辑尚未实现，本故事只保存后续可读取的收件邮箱。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `node --test tests\profile-settings.test.mjs`（RED：缺少 profile 输入和 service，预期失败）
- `node --test tests\profile-settings.test.mjs`
- `npm test`
- `npm run typecheck`（首次发现身高解析类型收窄问题，已修复）
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

### Completion Notes List

- 新增个人资料输入解析，校验身高和邮箱并保留原始输入。
- 新增 profile settings service，保存和读取 `profile/basic`。
- 新增个人资料 server action 和设置页表单。
- 首页 BMI 读取已保存身高；未设置身高时仍显示中文缺失提示。

### File List

- `app/page.tsx`
- `app/settings/page.tsx`
- `features/settings/actions/profile-form-state.ts`
- `features/settings/actions/save-profile.ts`
- `features/settings/components/profile-form.tsx`
- `features/settings/services/profile-input.ts`
- `features/settings/services/profile-settings-service.ts`
- `tests/app-shell.test.mjs`
- `tests/profile-settings.test.mjs`
- `_bmad-output/implementation-artifacts/4-2-维护个人资料与-BMI-前置配置.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

- No blocking findings after self-review.

### Change Log

- 2026-06-26: Created Story 4.2 implementation context and started development.
- 2026-06-26: Implemented Story 4.2 profile settings form, action, service, BMI height wiring and tests; marked done.
