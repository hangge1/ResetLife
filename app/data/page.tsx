import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { StatusCard } from "@/features/dashboard/components/status-card";
import { TrendLineChart } from "@/features/dashboard/components/trend-line-chart";
import {
  createDashboardSummary,
  type DashboardProgressCard,
} from "@/features/dashboard/services/dashboard-summary";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createRecordsRepository } from "@/features/records/repositories/records-repository";
import { createGoalsRepository } from "@/features/goals/repositories/goals-repository";
import { createSettingsRepository } from "@/features/settings/repositories/settings-repository";
import { getProfileSettings } from "@/features/settings/services/profile-settings-service";
import { getReminderRuleSettings } from "@/features/settings/services/reminder-rule-settings-service";
import { getTrendThresholdSettings } from "@/features/settings/services/trend-threshold-settings-service";
import { getTodayLocalDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

function GoalProgressBar({ card }: { card: DashboardProgressCard }) {
  const percent = Math.max(0, Math.min(100, card.progressPercent));

  return (
    <div className="goal-progress-meter" aria-label={`${card.title} ${percent}%`}>
      <div className="goal-progress-meter__header">
        <span>目标完成度</span>
        <strong>{percent}%</strong>
      </div>
      <div className="goal-progress-track">
        <span className="goal-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="goal-progress-gap">{card.gap}</p>
    </div>
  );
}

export default async function DataPage() {
  await requireTrustedDevice();

  const settingsRepository = createSettingsRepository();
  const profile = getProfileSettings(settingsRepository);
  const trendThresholds = getTrendThresholdSettings(settingsRepository);
  const reminderRules = getReminderRuleSettings(settingsRepository);
  const reminderStatus =
    reminderRules.ok && (reminderRules.data.inAppEnabled || reminderRules.data.emailEnabled) ? "已开启提醒" : "未开启提醒";
  const summary = createDashboardSummary({
    recordsRepository: createRecordsRepository(),
    goalsRepository: createGoalsRepository(),
    todayLocalDate: getTodayLocalDate(),
    includeAnalytics: true,
    heightCm: profile.ok ? profile.data.heightCm : null,
    estimationThresholds: trendThresholds.ok ? trendThresholds.data : undefined,
    reminderStatus,
  });

  return (
    <AppShell>
      <main className="workbench-main">
        <section className="workbench-hero">
          <p className="workbench-eyebrow">数据看板</p>
          <h1 className="workbench-title">看目标进度和长期变化</h1>
          <p className="workbench-description">
            首页只给行动入口；这里集中看健康、跑步、目标差距和趋势曲线。
          </p>
        </section>

        <section aria-labelledby="data-summary" className="mb-5">
          <h2 id="data-summary" className="mb-3 text-lg font-black text-[var(--ink-primary)]">
            数据摘要
          </h2>
          <div className="workbench-grid md:grid-cols-3">
            {summary.metricCards.map((card) => (
              <StatusCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section aria-labelledby="goal-progress" className="mb-5">
          <h2 id="goal-progress" className="mb-3 text-lg font-black text-[var(--ink-primary)]">
            目标进度
          </h2>
          <div className="workbench-grid workbench-grid--two">
            {summary.progressCards.map((card) => (
              <article className="workbench-card" key={card.title}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="workbench-card-title">{card.title}</h3>
                  <span className="rounded-full bg-[rgba(47,109,179,0.12)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {card.status}
                  </span>
                </div>
                <div className="grid gap-4">
                  <div className="goal-progress-detail-grid">
                    <div className="goal-progress-detail">
                      <span>当前值</span>
                      <strong>{card.currentValue}</strong>
                    </div>
                    <div className="goal-progress-detail">
                      <span>目标值</span>
                      <strong>{card.targetValue}</strong>
                    </div>
                    <div className="goal-progress-detail">
                      <span>剩余差距</span>
                      <strong>{card.gap}</strong>
                    </div>
                    <div className="goal-progress-detail">
                      <span>预计达成</span>
                      <strong>{card.estimate}</strong>
                    </div>
                  </div>
                  <GoalProgressBar card={card} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-sm text-[var(--ink-secondary)]">{card.description}</p>
                    <Link className="inline-action-link" href="/goals">
                      {card.title.includes("跑步") ? "设置跑步目标" : "设置健康目标"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="data-curves">
          <h2 id="data-curves" className="mb-3 text-lg font-black text-[var(--ink-primary)]">
            数据曲线
          </h2>
          <div className="workbench-grid">
            {summary.chartPanels.map((panel) => (
              <TrendLineChart key={panel.title} panel={panel} />
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}


