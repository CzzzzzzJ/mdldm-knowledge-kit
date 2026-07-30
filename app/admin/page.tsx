import Link from "next/link";

import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";

export const dynamic = "force-dynamic";

const quickEntries = [
  {
    href: "/admin/site",
    title: "设置站点",
    description: "更新品牌、创作者资料、导航和首页展示，让知识站真正属于你。",
    action: "前往站点设置",
  },
  {
    href: "/admin/catalog",
    title: "发布内容",
    description: "创建课程系列和课时，上传视频与资料，并完成上线前检查。",
    action: "管理课程内容",
  },
  {
    href: "/admin/products",
    title: "配置商品",
    description: "设置全站会员、单课和系列商品的价格、期限、权益目标与上下架状态。",
    action: "管理商品",
  },
  {
    href: "/admin/orders",
    title: "处理订单",
    description: "查看最近订单，确认人工收款，并重试未完成的权益发放。",
    action: "查看订单",
  },
  {
    href: "/admin/system",
    title: "检查系统",
    description: "查看 Provider、运营数据和失败队列，按提示定位主要故障。",
    action: "打开系统状态",
  },
] as const;

export default async function AdminPage() {
  const user = await requireAdminPage("/admin");

  return (
    <AdminShell
      active="overview"
      currentUserEmail={user.email}
      description="从这里进入每个运营分区。第一次开站建议按站点、内容、订单、系统的顺序完成检查。"
      title="运营总览"
    >
      <section aria-labelledby="quick-entries-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-2xl font-semibold tracking-[-0.035em]"
              id="quick-entries-title"
            >
              今天要做什么
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              每个分区只处理一类工作，减少在同一页里来回寻找功能。
            </p>
          </div>
          <Link
            className="focus-ring rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            href="/"
          >
            查看公开站点
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {quickEntries.map((entry) => (
            <article className="surface flex min-h-56 flex-col p-6" key={entry.href}>
              <h3 className="text-2xl font-semibold tracking-[-0.035em]">
                {entry.title}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
                {entry.description}
              </p>
              <Link
                className="focus-ring mt-auto pt-8 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                href={entry.href}
              >
                {entry.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
