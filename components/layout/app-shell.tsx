import { TopNav } from "@/components/layout/top-nav";
import { PageTurnControls } from "@/components/layout/page-turn-controls";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="min-w-0">
        {children}
      </div>
      <PageTurnControls />
    </div>
  );
}
