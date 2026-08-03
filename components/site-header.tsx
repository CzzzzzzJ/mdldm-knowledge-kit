import Link from "next/link";

import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";
import { MdldmActionLink } from "@/components/mdldm-ui";
import type { SiteConfig } from "@/modules/site";
import { getCurrentUser } from "@/providers/auth/session";

export async function SiteHeader({ site }: { site: SiteConfig }) {
  const [resolved, user] = await Promise.all([
    getResolvedSiteSettings(),
    getCurrentUser(),
  ]);
  const displayName = resolved.siteName || site.name;
  const mark = Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
  const isSignedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-[var(--ink)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="page-shell flex h-[4.25rem] items-center justify-between gap-4">
        <Link
          className="focus-ring flex min-w-0 items-center gap-3 rounded-lg font-black"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-xs font-black text-[var(--accent-ink)] shadow-[3px_3px_0_var(--hard-shadow)]"
          >
            {mark || "MK"}
          </span>
          <span className="hidden max-w-52 truncate text-sm tracking-[-0.02em] sm:block lg:max-w-64">
            {displayName}
          </span>
        </Link>

        <nav
          aria-label="主导航"
          className="flex min-w-0 items-center gap-3 text-sm font-black sm:gap-5"
        >
          <Link
            className="focus-ring whitespace-nowrap rounded-md text-[var(--ink)] underline-offset-4 hover:underline"
            href="/courses"
          >
            课程
          </Link>
          <Link
            className="focus-ring hidden whitespace-nowrap rounded-md text-[var(--ink)] underline-offset-4 hover:underline sm:block"
            href="/account"
          >
            学习
          </Link>
          <Link
            className="focus-ring hidden whitespace-nowrap rounded-md text-[var(--ink)] underline-offset-4 hover:underline md:block"
            href="/pricing"
          >
            会员与单课
          </Link>
          <MdldmActionLink
            className="min-h-9 px-3 py-2"
            href={isSignedIn ? "/account" : "/login"}
            variant="primary"
          >
            {isSignedIn ? "账户" : "登录"}
          </MdldmActionLink>
        </nav>
      </div>
    </header>
  );
}
