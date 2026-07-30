import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";

export type AdminSection =
  | "overview"
  | "site"
  | "catalog"
  | "products"
  | "orders"
  | "system";

const adminNavigation: Array<{
  key: AdminSection;
  href: string;
  label: string;
}> = [
  { key: "overview", href: "/admin", label: "总览" },
  { key: "site", href: "/admin/site", label: "站点" },
  { key: "catalog", href: "/admin/catalog", label: "内容" },
  { key: "products", href: "/admin/products", label: "商品" },
  { key: "orders", href: "/admin/orders", label: "订单" },
  { key: "system", href: "/admin/system", label: "系统" },
];

export async function requireAdminPage(nextPath: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect(`/login?next=${nextPath}`);
  }
  return user;
}

export function AdminShell({
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
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
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
            <div className="text-left text-sm sm:text-right">
              <p className="text-[var(--muted)]">当前管理员</p>
              <p className="mt-1 font-medium">{currentUserEmail}</p>
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
