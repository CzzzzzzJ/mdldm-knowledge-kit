import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { listAdminUsers } from "@/app/lib/user-query-service";
import { ChangePasswordForm } from "@/components/identity-forms";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export default async function AdminUsersPage() {
  const admin = await requireAdminPage("/admin/users");
  const users = await listAdminUsers();

  return (
    <AdminShell
      active="users"
      currentUserEmail={admin.email}
      description="查看最近用户和账号状态，并在同一个后台管理自己的站长密码。"
      title="用户与账号"
    >
      <div className="mt-10 grid gap-8 xl:grid-cols-[1.3fr_0.7fr] xl:items-start">
        <section>
          <div>
            <h2 className="text-2xl font-black tracking-[-0.035em]">
              最近用户
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              当前显示最近 100 个账号。密码和会话信息不会出现在列表中。
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {users.map((user) => (
              <article
                className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                key={user.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{user.name}</h3>
                    <span className="md-badge">
                      {user.role === "admin" ? "管理员" : "学员"}
                    </span>
                    <span className="md-badge">
                      {user.status === "active" ? "正常" : "已停用"}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-bold">
                    {user.emailVerified ? "邮箱已验证" : "邮箱未验证"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    注册于 {formatDate(new Date(user.createdAt))}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="xl:sticky xl:top-28">
          <div className="md-panel p-6">
            <p className="font-mono text-xs font-black text-[var(--accent-strong)]">
              {admin.email}
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">
              修改站长密码
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              修改成功后，其他设备上的会话会退出。当前设备保留登录状态。
            </p>
            <ChangePasswordForm />
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
