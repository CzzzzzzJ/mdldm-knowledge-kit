import { Suspense } from "react";

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
            Phase 2 仅开放受控管理员账号，普通用户注册将在下一阶段完成。
          </p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
