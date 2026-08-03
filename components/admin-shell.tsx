import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";
import { AdminAccountActions } from "@/components/admin-account-actions";
import { getCurrentUser } from "@/providers/auth/session";

export type AdminSection =
  | "setup"
  | "overview"
  | "site"
  | "catalog"
  | "products"
  | "users"
  | "orders"
  | "system";

const adminNavigation: Array<{
  key: AdminSection;
  href: string;
  label: string;
}> = [
  { key: "setup", href: "/admin/setup", label: "开站指南" },
  { key: "overview", href: "/admin", label: "总览" },
  { key: "site", href: "/admin/site", label: "站点" },
  { key: "catalog", href: "/admin/catalog", label: "内容" },
  { key: "products", href: "/admin/products", label: "商品" },
  { key: "users", href: "/admin/users", label: "用户" },
  { key: "orders", href: "/admin/orders", label: "订单" },
  { key: "system", href: "/admin/system", label: "系统" },
];

export async function requireAdminPage(nextPath: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect(`/login?next=${nextPath}`);
  }
  if (user.requiresPasswordChange) {
    redirect("/admin/activate");
  }
  return user;
}

export async function AdminShell({
  active,
  currentUserEmail,
  title,
  description,
  children,
}: {
  active: AdminSection;
  currentUserEmail: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const site = await getResolvedSiteSettings();

  return (
    <>
      <header className="sticky top-0 z-20 border-b-2 border-[var(--ink)] bg-[var(--surface)]">
        <div className="page-shell flex min-h-[4.5rem] items-center justify-between gap-4 py-2">
          <Link
            className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
            href="/admin"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-xs font-black shadow-[3px_3px_0_var(--hard-shadow)]">
              MK
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">
                站长后台
              </span>
              <span className="hidden truncate text-xs text-[var(--muted)] sm:block">
                {site.siteName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              className="md-text-link hidden whitespace-nowrap text-xs sm:block"
              href="/"
            >
              查看网站
            </Link>
            <AdminAccountActions email={currentUserEmail} />
          </div>
        </div>
      </header>
      <main className="page-shell py-10 sm:py-12">
        <header>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">
                站长后台
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[var(--muted)]">
                {description}
              </p>
            </div>
          </div>

          <nav
            aria-label="后台功能"
            className="mt-8 flex flex-wrap gap-2 border-y border-[var(--line)] py-3"
          >
            {adminNavigation.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`focus-ring whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--ink)] text-[var(--page)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)]"
                  }`}
                  href={item.href}
                  key={item.key}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {children}
      </main>
    </>
  );
}
