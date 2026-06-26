---
name: 瘦身助手
status: final
description: 简洁、数据优先的个人健康与跑步管理界面。
sources:
  - ../prds/prd-SlimmingAssistant-2026-06-25/prd.md
updated: 2026-06-26
colors:
  surface-base: '#F7F8FA'
  surface-panel: '#FFFFFF'
  surface-subtle: '#EEF2F5'
  ink-primary: '#18212A'
  ink-secondary: '#5F6B76'
  ink-muted: '#8B96A1'
  border-soft: '#DDE4EA'
  primary: '#2563EB'
  primary-foreground: '#FFFFFF'
  health: '#10B981'
  health-soft: '#DFF8EC'
  motion: '#0EA5E9'
  motion-soft: '#E0F2FE'
  warning: '#F59E0B'
  warning-soft: '#FEF3C7'
  danger: '#DC2626'
  danger-soft: '#FEE2E2'
typography:
  display:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: '650'
    lineHeight: '1.2'
    letterSpacing: '0'
  title:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 22px
    fontWeight: '650'
    lineHeight: '1.3'
    letterSpacing: '0'
  section:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: '650'
    lineHeight: '1.4'
    letterSpacing: '0'
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.55'
    letterSpacing: '0'
  label:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  metric:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  content-max: 1200px
  mobile-margin: 16px
  desktop-margin: 24px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  card:
    background: '{colors.surface-panel}'
    border: '1px solid {colors.border-soft}'
    radius: '{rounded.lg}'
  health-badge:
    background: '{colors.health-soft}'
    foreground: '{colors.health}'
    radius: '{rounded.full}'
  motion-badge:
    background: '{colors.motion-soft}'
    foreground: '{colors.motion}'
    radius: '{rounded.full}'
---

# 瘦身助手视觉规范

## 品牌与风格

瘦身助手应该像一个简洁的个人健康控制台，而不是健身社交应用。界面要安静、实用、数据优先，帮助用户快速看到今天要做什么、记录是否完成、距离目标还差多少。

整体视觉方向是简洁：中性色表面、克制用色、紧凑卡片、清楚图表、明确表单。鼓励文案可以有温度，但必须具体、克制，并和真实数据相关。避免勋章、烟花、连续打卡压迫感、巨大首页宣传区、装饰渐变和强运动品牌风。

## 颜色

- **基础表面** 使用 `{colors.surface-base}` 和 `{colors.surface-panel}`，保持明亮、干净、低干扰。
- **主蓝色** `{colors.primary}` 只用于主操作、当前导航和选中状态。
- **健康绿色** `{colors.health}` 表示身体指标、健康目标进度和正向健康变化。
- **运动蓝色** `{colors.motion}` 表示跑步记录、周跑量、配速和运动目标进度。
- **提醒黄色** `{colors.warning}` 用于缺失记录、未完成设置和需要注意的提醒。
- **危险红色** `{colors.danger}` 只用于删除、错误和破坏性操作。

颜色不能作为装饰使用。每一种彩色都必须表达分类、操作或状态。

## 字体

全站使用一套无衬线字体：Inter 或系统默认字体。产品是工具，优先保证可读性、密度和稳定布局。

大标题只用于首页问候和重要空状态。数字指标使用 `{typography.metric}`，必须配明确标签和单位。标签不使用全大写，也不增加字距。

## 布局与间距

瘦身助手是响应式网页应用：

- 桌面和平板：左侧常驻导航、顶部工具区、内容区域最大宽度 `{spacing.content-max}`。
- 手机：顶部标题栏和底部主导航。
- 首页桌面使用 12 栅格，手机使用单列堆叠。
- 卡片保持紧凑，不允许卡片套卡片。
- 页面分区使用无边框布局；卡片只用于指标、图表、表单、列表项和弹窗。

间距使用 4px 基础刻度。高密度数据页面主要使用 `{spacing.4}` 到 `{spacing.6}`；空状态可以使用 `{spacing.8}`。

## 层级与深度

视觉层级以边框、留白和表面色区分。避免厚重阴影。阴影只用于弹窗、下拉菜单和移动端抽屉。

指标卡、图表卡、表单面板使用 `{components.card}`。悬停状态可以轻微改变边框颜色，但不能造成布局跳动。

## 形状

圆角保持克制：

- 输入框和按钮：`{rounded.md}`。
- 卡片和弹窗：`{rounded.lg}`。
- 徽标和状态标签：`{rounded.full}`。

避免大圆角容器和过多胶囊形按钮。

## 组件

- **主按钮**：使用 `{components.button-primary}`。每个页面尽量只有一个主操作。
- **指标卡**：白色面板、浅边框、标签、数值、单位、变化说明和可选迷你趋势。健康指标使用 `{colors.health}`；运动指标使用 `{colors.motion}`。
- **目标进度卡**：显示当前值、目标值、剩余差距、进度条和预计达成时间。不能估算时显示原因。
- **图表卡**：使用简单折线图或柱状图，标签清楚，不使用装饰性填充。
- **记录表单**：按领域分组，先健康数据，再跑步数据。所有输入都显示单位。
- **提醒条**：页面内提醒，不使用弹窗打断。缺失动作时使用 `{colors.warning-soft}`。
- **设置行**：左侧名称和说明，中间当前值，右侧操作。敏感字段默认遮罩。

## 应该做与不要做

| 应该做 | 不要做 |
|---|---|
| 健康绿色和运动蓝色按数据领域稳定使用 | 随意混用颜色 |
| 首页第一屏直接提供有用状态 | 做成宣传页或大幅营销区 |
| 表单快速、明确、带单位 | 只靠占位符表达单位 |
| 数据不足时诚实说明 | 用弱数据编造预计日期 |
| 鼓励文案基于真实进展 | 使用羞辱、夸张或打卡压迫式文案 |
