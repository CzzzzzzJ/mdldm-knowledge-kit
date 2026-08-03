import Link from "next/link";

import { InitialAdminSetupForm } from "@/components/initial-admin-setup-form";

export function InitialAdminSetupPage({
  available,
  requiresSetupToken,
}: {
  available: boolean;
  requiresSetupToken: boolean;
}) {
  return (
    <main className="min-h-[100dvh] bg-dot-pattern px-5 py-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="lg:sticky lg:top-12">
          <Link
            className="focus-ring inline-flex items-center gap-3 rounded-lg font-black"
            href="/admin"
          >
            <span className="grid size-11 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-sm shadow-[4px_4px_0_var(--hard-shadow)]">
              MK
            </span>
            mdldm Knowledge Kit
          </Link>
          <p className="mt-12 font-mono text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            首次开站
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl">
            用你的邮箱创建管理员 1 号
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">
            输入并确认两次自己的邮箱，系统会把它作为后台登录账号，并生成本次部署独有的临时密码。
          </p>

          <div className="mt-8 border-l-4 border-[var(--accent)] pl-5">
            <p className="font-black">为什么先做这一步</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              后续所有配置都会记录操作者。先确认邮箱，再由系统生成临时凭据，可以避免开源项目携带所有人共用的默认账号和密码。
            </p>
          </div>
        </section>

        <section>
          <div className="md-panel bg-[var(--accent)] p-5 text-[var(--accent-ink)]">
            <p className="font-black">一次性入口</p>
            <p className="mt-2 text-sm leading-6">
              系统只允许创建一个首个管理员。临时密码只展示一次；设置正式密码前，其他后台页面不会开放。
            </p>
          </div>
          <InitialAdminSetupForm
            available={available}
            requiresSetupToken={requiresSetupToken}
          />
        </section>
      </div>
    </main>
  );
}
