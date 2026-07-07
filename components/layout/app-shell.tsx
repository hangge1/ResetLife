import { TopNav } from "@/components/layout/top-nav";
import { PageTurnControls } from "@/components/layout/page-turn-controls";
import type { AuthContext } from "@/features/access/services/auth-context";

export function AppShell({ authMode, children }: { authMode?: AuthContext["mode"]; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <TopNav authMode={authMode} />
      <div className="min-w-0">
        {children}
      </div>
      <PageTurnControls />
    </div>
  );
}
