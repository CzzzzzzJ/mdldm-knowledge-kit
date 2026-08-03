import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import {
  MdldmAccessBadge,
  MdldmActionLink,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPanel,
  MdldmSectionHeading,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";
import { CourseProgressModel } from "@/providers/database/mongodb/models/learning";
import { CourseModel } from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) {
    return "长期有效";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(date);
}

export default async function AccountPage() {
  await requirePublicSiteAccess();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account");
  }

  await connectMongo();
  const now = new Date();
  const [entitlements, progressRecords] = await Promise.all([
    EntitlementModel.find({
      userId: user.id,
      startsAt: { $lte: now },
      revokedAt: null,
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean(),
    CourseProgressModel.find({ userId: user.id })
      .sort({ lastWatchedAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const courses = await CourseModel.find({
    _id: { $in: progressRecords.map((progress) => progress.courseId) },
    status: "published",
  }).lean();
  const courseById = new Map(
    courses.map((course) => [course._id.toString(), course]),
  );
  const membership = entitlements.find(
    (entitlement) => entitlement.type === "membership",
  );
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-grid-pattern border-b-2 border-[var(--ink)] py-10 sm:py-14">
          <div className="page-shell">
            <MdldmPanel className="relative overflow-hidden bg-[var(--accent)] p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute -right-6 -top-6 size-24 rounded-full border-2 border-[var(--ink)] bg-[var(--brand-blue)] shadow-[5px_5px_0_var(--hard-shadow)]"
              />
              <p className="md-badge bg-[var(--surface)]">学习中心</p>
              <h1 className="relative mt-5 max-w-4xl text-4xl font-black leading-[1.06] tracking-[-0.055em] sm:text-5xl">
                欢迎回来，{user.name}
              </h1>
              <p className="relative mt-4 max-w-2xl font-bold leading-7 text-[var(--accent-ink)]">
                继续学习，查看会员和已购课程，不需要从订单里寻找入口。
              </p>
            </MdldmPanel>
          </div>
        </section>

        <section className="page-shell py-12 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <MdldmPanel className="p-6 sm:p-8">
              <MdldmSectionHeading
                action={
                  <MdldmActionLink href="/courses" variant="quiet">
                    浏览全部课程
                  </MdldmActionLink>
                }
                description="最近观看的课程会出现在这里。"
                title="继续学习"
              />

              {progressRecords.length === 0 ? (
                <MdldmEmptyState
                  action={
                    <MdldmActionLink href="/courses" variant="accent">
                      选择课程
                    </MdldmActionLink>
                  }
                  className="mt-8 bg-[var(--surface-strong)] shadow-none"
                  description="先从公开课程开始，播放进度会自动保存在学习中心。"
                  title="还没有学习记录"
                />
              ) : (
                <div className="mt-7 grid gap-4">
                  {progressRecords.map((progress) => {
                    const course = courseById.get(progress.courseId.toString());
                    if (!course) {
                      return null;
                    }

                    const percent =
                      progress.durationSeconds > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (progress.currentTimeSeconds /
                                progress.durationSeconds) *
                                100,
                            ),
                          )
                        : 0;

                    return (
                      <Link
                        className="focus-ring md-pressable grid gap-4 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 shadow-[4px_4px_0_var(--hard-shadow)] sm:grid-cols-[1fr_auto] sm:items-center"
                        href={`/learn/${course._id.toString()}`}
                        key={progress._id.toString()}
                      >
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <MdldmAccessBadge level={course.accessLevel} />
                            <span className="text-lg font-black">
                              {course.title}
                            </span>
                          </span>
                          <span className="mt-2 block text-sm font-bold text-[var(--muted)]">
                            {progress.completed
                              ? "已完成"
                              : `已学习 ${percent}%`}
                          </span>
                        </span>
                        <span className="font-black underline decoration-2 underline-offset-4">
                          {progress.completed ? "重新学习" : "继续"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </MdldmPanel>

            <div className="grid content-start gap-6">
              <MdldmPanel className="overflow-hidden">
                <div className="border-b-2 border-[var(--ink)] bg-[var(--brand-blue)] p-5 text-[var(--accent-ink)]">
                  <h2 className="text-xl font-black">我的权益</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm font-black text-[var(--muted)]">
                    全站会员
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {membership ? "当前有效" : "尚未开通"}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
                    {membership
                      ? `有效期至 ${formatDate(membership.endsAt)}`
                      : "也可以单独购买需要的课程。"}
                  </p>
                  <p className="mt-5 border-t-2 border-dashed border-[var(--line-soft)] pt-4 text-sm font-bold text-[var(--muted)]">
                    其他有效权益：
                    {Math.max(
                      0,
                      entitlements.length - (membership ? 1 : 0),
                    )}{" "}
                    项
                  </p>
                  <MdldmActionLink
                    className="mt-5 w-full"
                    href="/pricing"
                    variant="accent"
                  >
                    查看会员与单课
                  </MdldmActionLink>
                </div>
              </MdldmPanel>

              <MdldmPanel className="p-6">
                <h2 className="text-xl font-black">账户管理</h2>
                <nav className="mt-4 grid gap-3" aria-label="账户管理">
                  <MdldmActionLink
                    href="/account/orders"
                    variant="secondary"
                  >
                    我的订单
                  </MdldmActionLink>
                  <MdldmActionLink
                    href="/account/security"
                    variant="secondary"
                  >
                    账户安全
                  </MdldmActionLink>
                </nav>
              </MdldmPanel>
            </div>
          </div>
        </section>
      </main>
      <MdldmFooter
        siteName={site.name}
        supportEmail={site.creator.supportEmail}
      />
    </>
  );
}
