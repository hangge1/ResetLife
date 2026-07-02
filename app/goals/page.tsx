import { AppShell } from "@/components/layout/app-shell";
import { GoalSettingsSection } from "@/features/goals/components/goal-settings-section";
import { requireTrustedDevice } from "@/features/access/services/route-guards";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  await requireTrustedDevice();

  return (
    <AppShell>
      <main className="workbench-main">
        <section className="workbench-hero">
          <p className="workbench-eyebrow">目标管理</p>
          <h1 className="workbench-title">设置体重、腰围和跑步目标</h1>
          <p className="workbench-description">
            首页只展示关键目标卡片；这里负责维护更完整的健康目标和跑步目标。
          </p>
        </section>
        <GoalSettingsSection />
      </main>
    </AppShell>
  );
}
