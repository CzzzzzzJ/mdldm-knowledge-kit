import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";

export default function LoginPage() {
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">登录</h1>
          <p className="mt-3 text-[var(--muted)]">
            管理员与已完成邮箱验证的普通用户都从这里登录。
          </p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link className="text-[var(--accent)]" href="/register">
              注册账号
            </Link>
            <Link className="text-[var(--accent)]" href="/forgot-password">
              找回密码
            </Link>
            <Link className="text-[var(--accent)]" href="/resend-verification">
              重发验证邮件
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
