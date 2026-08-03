import Link from "next/link";
import { redirect } from "next/navigation";

import { InitialAdminActivationForm } from "@/components/initial-admin-activation-form";
import { getCurrentUser } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export default async function InitialAdminActivationPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin/activate");
  }
  if (user.role !== "admin") {
    redirect("/");
  }
  if (!user.requiresPasswordChange) {
    redirect("/admin");
  }

  return (
    <main className="min-h-[100dvh] bg-dot-pattern px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <Link
          className="focus-ring inline-flex items-center gap-3 rounded-lg font-black"
          href="/admin/activate"
        >
          <span className="grid size-11 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-sm shadow-[4px_4px_0_var(--hard-shadow)]">
            MK
          </span>
          mdldm Knowledge Kit
        </Link>

        <p className="mt-12 font-mono text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
          激活管理员 1 号 · {user.email}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl">
          用你自己的正式密码接管后台
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">
          临时密码只负责第一次进入。保存正式密码后，临时密码会立即失效，其他会话也会退出。
        </p>

        <InitialAdminActivationForm />
      </div>
    </main>
  );
}
