import { AppShell } from "@/components/layout/app-shell";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { HealthGoalForm } from "@/features/goals/components/health-goal-form";
import { RunGoalForm } from "@/features/goals/components/run-goal-form";
import { createGoalsRepository } from "@/features/goals/repositories/goals-repository";
import { getHealthGoal, getRunGoal } from "@/features/goals/services/goals-service";
import { healthGoalToFormValues } from "@/features/goals/actions/health-goal-form-state";
import { runGoalToFormValues } from "@/features/goals/actions/run-goal-form-state";
import type { Goal } from "@/db/schema";

export const dynamic = "force-dynamic";

function formatOptionalValue(value: number | null, unit: string) {
  return value == null ? "未设置" : `${value} ${unit}`;
}

function HealthGoalSummary({ goal }: { goal: Goal | null }) {
  if (!goal) {
    return (
      <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3">
        <p className="m-0 text-sm text-[var(--ink-secondary)]">
          还没有设置健康目标。先填写目标体重，后续首页会基于目标展示差距和进度。
        </p>
      </div>
    );
  }

  const items = [
    { label: "目标体重", value: `${goal.targetWeightKg} 公斤` },
    { label: "目标腰围", value: formatOptionalValue(goal.targetWaistCm, "厘米") },
    { label: "目标臀围", value: formatOptionalValue(goal.targetHipCm, "厘米") },
    { label: "目标体脂率", value: formatOptionalValue(goal.targetBodyFatPercentage, "%") },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2"
          key={item.label}
        >
          <p className="m-0 text-xs font-semibold text-[var(--ink-secondary)]">{item.label}</p>
          <p className="m-0 mt-1 text-base font-semibold text-[var(--ink-primary)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function RunGoalSummary({ goal }: { goal: Goal | null }) {
  if (!goal) {
    return (
      <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3">
        <p className="m-0 text-sm text-[var(--ink-secondary)]">
          还没有设置跑步目标。填写每周跑步次数和每周跑量后，后续首页会展示运动目标进度。
        </p>
      </div>
    );
  }

  const items = [
    { label: "每周跑步次数", value: `${goal.weeklyRunCount} 次` },
    { label: "每周跑量", value: `${goal.weeklyDistanceKm} 公里` },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2"
          key={item.label}
        >
          <p className="m-0 text-xs font-semibold text-[var(--ink-secondary)]">{item.label}</p>
          <p className="m-0 mt-1 text-base font-semibold text-[var(--ink-primary)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default async function GoalsPage() {
  await requireTrustedDevice();

  const repository = createGoalsRepository();
  const healthGoal = getHealthGoal(repository);
  const runGoal = getRunGoal(repository);
  const healthGoalError =
    !healthGoal.ok && "error" in healthGoal ? healthGoal.error.message : "目标数据读取失败";
  const runGoalError = !runGoal.ok && "error" in runGoal ? runGoal.error.message : "目标数据读取失败";
  const currentHealthGoal = healthGoal.ok ? healthGoal.data : null;
  const currentRunGoal = runGoal.ok ? runGoal.data : null;
  const initialHealthGoalState = {
    values: healthGoalToFormValues(currentHealthGoal),
    fieldErrors: healthGoal.ok ? {} : { form: healthGoalError },
  };
  const initialRunGoalState = {
    values: runGoalToFormValues(currentRunGoal),
    fieldErrors: runGoal.ok ? {} : { form: runGoalError },
  };

  return (
    <AppShell>
      <main className="page-main">
        <div className="grid gap-4">
          <section className="card p-4">
            <div className="mb-4">
              <p className="mb-1 text-sm font-semibold text-[var(--ink-secondary)]">目标</p>
              <h1 className="m-0 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">
                健康目标
              </h1>
            </div>

            <div className="grid gap-5">
              <div>
                <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--ink-primary)]">当前健康目标</h2>
                <HealthGoalSummary goal={currentHealthGoal} />
              </div>

              <div className="border-t border-[var(--border-soft)] pt-4">
                <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--ink-primary)]">设置健康目标</h2>
                <HealthGoalForm initialState={initialHealthGoalState} />
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-4">
              <p className="mb-1 text-sm font-semibold text-[var(--ink-secondary)]">目标</p>
              <h2 className="m-0 text-xl font-semibold text-[var(--ink-primary)]">跑步目标</h2>
            </div>

            <div className="grid gap-5">
              <div>
                <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--ink-primary)]">当前跑步目标</h3>
                <RunGoalSummary goal={currentRunGoal} />
              </div>

              <div className="border-t border-[var(--border-soft)] pt-4">
                <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--ink-primary)]">设置跑步目标</h3>
                <RunGoalForm initialState={initialRunGoalState} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
