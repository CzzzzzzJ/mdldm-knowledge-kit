import Link from "next/link";

import { RegisterForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";

export default function RegisterPage() {
  const site = getSiteConfig();
  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">注册</h1>
          <p className="mt-3 text-[var(--muted)]">
            新账号始终由服务端创建为普通用户，验证邮箱后才可登录。
          </p>
          <RegisterForm />
          <p className="mt-5 text-sm text-[var(--muted)]">
            已有账号？{" "}
            <Link className="text-[var(--accent)]" href="/login">
              返回登录
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
