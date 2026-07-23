import Link from "next/link";

import type { SiteConfig } from "@/modules/site";

export function SiteHeader({ site }: { site: SiteConfig }) {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="page-shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link
          className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-[var(--ink)] font-mono text-sm font-bold text-[var(--page)]"
          >
            MK
          </span>
          <span className="truncate text-sm font-semibold tracking-[-0.02em]">
            {site.name}
          </span>
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-5 text-sm">
          <a
            className="focus-ring hidden rounded-md text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:block"
            href="#architecture"
          >
            架构
          </a>
          <a
            className="focus-ring hidden rounded-md text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:block"
            href="#commerce"
          >
            付费模式
          </a>
          <Link
            className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3.5 py-2 font-medium transition-transform active:translate-y-px"
            href="/api/health"
          >
            系统状态
          </Link>
        </nav>
      </div>
    </header>
  );
}
