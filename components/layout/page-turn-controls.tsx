"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

function getCurrentIndex(pathname: string) {
  const exactIndex = navigationItems.findIndex((item) => item.href === pathname);

  if (exactIndex >= 0) {
    return exactIndex;
  }

  return navigationItems.findIndex((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`));
}

export function PageTurnControls() {
  const pathname = usePathname();
  const currentIndex = getCurrentIndex(pathname);
  const previous = currentIndex > 0 ? navigationItems[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < navigationItems.length - 1 ? navigationItems[currentIndex + 1] : null;

  if (currentIndex < 0) {
    return null;
  }

  return (
    <>
      {previous ? (
        <Link
          aria-label={`切换到${previous.label}`}
          className="page-turn-zone page-turn-zone--left"
          href={previous.href}
        >
          <span className="page-turn-button">
            <ChevronLeft aria-hidden="true" className="size-7" />
          </span>
        </Link>
      ) : null}
      {next ? (
        <Link
          aria-label={`切换到${next.label}`}
          className="page-turn-zone page-turn-zone--right"
          href={next.href}
        >
          <span className="page-turn-button">
            <ChevronRight aria-hidden="true" className="size-7" />
          </span>
        </Link>
      ) : null}
    </>
  );
}
