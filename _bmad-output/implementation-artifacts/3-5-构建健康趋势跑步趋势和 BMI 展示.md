---
baseline_commit: 71289d6a95b7748d9e2ab430303ccf3a9f7fed42
---

# Story 3.5: 构建健康趋势跑步趋势和 BMI 展示

Status: done

## Story

As a 个人用户,
I want 在首页看到最近 7 天和 30 天的健康与跑步趋势,
so that 我可以判断变化方向而不是只看单日数据。

## Acceptance Criteria

1. Given 系统中已有健康记录、跑步记录和可选身高, when 用户打开首页, then 系统展示体重、腰围、臀围、体脂率的 7 天和 30 天趋势。
2. 设置身高后系统展示 BMI。
3. 未设置身高时 BMI 显示中文缺失提示，不阻塞其他指标。
4. 系统展示 7 天和 30 天跑量、跑步次数、平均配速或配速变化。
5. 数据不足时图表显示中文数据不足提示。
6. 图表旁提供中文文字摘要。
7. 趋势计算由 read-model service 完成，数据库不保存派生趋势结果。

## Tasks / Subtasks

- [x] 扩展首页 read-model service 与测试（AC: 1-7）
  - [x] 计算健康记录最近 7 天和 30 天趋势。
  - [x] 计算跑步记录最近 7 天和 30 天汇总。
  - [x] 在身高存在时计算 BMI。
  - [x] 身高缺失或数据不足时返回中文提示。
- [x] 实现首页趋势和 BMI UI（AC: 1-6）
  - [x] 首页展示趋势与 BMI 分组。
  - [x] 每张趋势卡提供数值、单位和中文摘要。
  - [x] 空数据或数据不足时不只依赖颜色表达。
- [x] 建立页面与架构守护测试（AC: 1-7）
  - [x] 路由烟测覆盖 7 天、30 天、BMI 和数据不足文案。
  - [x] 源码守护趋势来自 read-model service。
- [x] 完成验证
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm run lint`。
  - [x] 运行 `npm run build`。

## Dev Notes

- 当前设置中心尚未实现身高配置；本故事的 read-model 预留 `heightCm` 输入，首页暂传 `null`。
- 趋势和 BMI 都是派生结果，不写入数据库。
- 本故事不实现目标差距、预计达成时间和鼓励文案。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `node --test tests\dashboard-summary.test.mjs`（RED：缺少趋势和 BMI 派生结果，预期失败）
- `node --test tests\dashboard-summary.test.mjs`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Completion Notes List

- 扩展首页 read-model service，新增最近 7 天/30 天健康趋势、跑步趋势和 BMI 卡片。
- BMI read-model 预留 `heightCm` 输入；当前首页传 `null`，显示中文缺失提示，等待后续设置故事接入。
- 首页新增“趋势和 BMI”分组，空数据显示中文数据不足状态。
- 趋势和 BMI 均为派生结果，不写入数据库。

### File List

- `app/page.tsx`
- `features/dashboard/services/dashboard-summary.ts`
- `tests/app-shell.test.mjs`
- `tests/dashboard-summary.test.mjs`
- `_bmad-output/implementation-artifacts/3-5-构建健康趋势跑步趋势和 BMI 展示.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

- No blocking findings after self-review.

### Change Log

- 2026-06-26: Created Story 3.5 implementation context and started development.
- 2026-06-26: Implemented Story 3.5 health trends, run trends, BMI read-model and homepage UI; marked done.
