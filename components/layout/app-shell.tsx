import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <DesktopSidebar />
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-14 items-center border-b border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 md:hidden">
          <div className="text-base font-bold text-[var(--ink-primary)]">瘦身助手</div>
        </header>
        {children}
        <MobileNav />
      </div>
    </div>
  );
}
