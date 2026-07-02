"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[rgba(247,249,255,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2 px-4 py-2 sm:px-6">
        <Link
          className="group flex min-w-fit items-center gap-3 rounded-md pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href="/"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_24px_rgba(47,109,179,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5">
            <Activity aria-hidden="true" className="size-5" />
          </span>
          <span className="grid leading-tight">
            <span className="text-[17px] font-black text-[var(--ink-primary)]">
              跑步瘦身助手
            </span>
            <span className="hidden text-xs font-medium text-[var(--ink-muted)] sm:block">Run. Track. Lean.</span>
          </span>
        </Link>

        <nav aria-label="主导航" className="top-nav-scroll -mx-1 min-w-0 overflow-x-auto">
          <div className="flex min-w-full items-center gap-1 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "group flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md bg-[rgba(47,109,179,0.13)] px-3 text-sm font-semibold text-[var(--color-ink)] shadow-sm ring-1 ring-[rgba(47,109,179,0.24)] transition-all duration-200 sm:min-h-10 sm:px-4"
                      : "group flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--ink-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(47,109,179,0.08)] hover:text-[var(--ink-primary)] hover:shadow-sm sm:min-h-10 sm:px-4"
                  }
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}


