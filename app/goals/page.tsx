import { AppShell } from "@/components/layout/app-shell";
import { GoalSettingsSection } from "@/features/goals/components/goal-settings-section";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createGoalsRepositoryForAuth } from "@/features/access/services/scoped-repositories";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const auth = await requireAuthContext();
  const goalsRepository = createGoalsRepositoryForAuth(auth);

  return (
    <AppShell authMode={auth.mode}>
      <main className="workbench-main">
        {auth.mode === "guest" ? (
          <p className="m-0 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]">
            访客模式：目标只保存在临时会话中，不会写入数据库。
          </p>
        ) : null}
        <section className="workbench-hero">
          <p className="workbench-eyebrow">目标管理</p>
          <h1 className="workbench-title">设置体重、腰围和跑步目标</h1>
          <p className="workbench-description">
            首页只展示关键目标卡片；这里负责维护更完整的健康目标和跑步目标。
          </p>
        </section>
        <GoalSettingsSection repository={goalsRepository} />
      </main>
    </AppShell>
  );
}
