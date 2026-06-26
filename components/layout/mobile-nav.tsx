"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="移动端主导航"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[var(--border-soft)] bg-[var(--surface-panel)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--primary)]"
                : "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-[var(--ink-secondary)]"
            }
          >
            <Icon aria-hidden="true" className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
