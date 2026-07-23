import type { Metadata } from "next";
import Link from "next/link";
import type { Types } from "mongoose";

import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  type SeriesRecord,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "课程",
};

export default async function CoursesPage() {
  const site = getSiteConfig();
  let series: Array<SeriesRecord & { _id: Types.ObjectId }> = [];

  try {
    await connectMongo();
    series = await SeriesModel.find({ status: "published" })
      .sort({ createdAt: -1 })
      .lean();
  } catch {
    series = [];
  }

  const entries = await Promise.all(
    series.map(async (item) => ({
      series: item,
      courses: await CourseModel.find({
        seriesId: item._id,
        status: "published",
      })
        .sort({ position: 1 })
        .lean(),
    })),
  );

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-[-0.05em]">课程</h1>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
            从公开内容开始，再按会员或单课权益继续学习。
          </p>
        </div>

        {entries.length === 0 ? (
          <section className="surface mt-10 p-8">
            <h2 className="text-xl font-semibold">还没有已发布课程</h2>
            <p className="mt-2 text-[var(--muted)]">
              运行 `npm run seed-demo` 创建虚构示例内容。
            </p>
          </section>
        ) : (
          <div className="mt-12 space-y-10">
            {entries.map(({ series: item, courses }) => (
              <section className="surface p-6 sm:p-8" key={item._id.toString()}>
                <h2 className="text-3xl font-semibold tracking-[-0.035em]">
                  {item.title}
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
                  {item.description}
                </p>
                <div className="mt-7 grid gap-3">
                  {courses.map((course) => (
                    <Link
                      className="focus-ring grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--page)] p-5 transition-transform hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center"
                      href={`/learn/${course._id.toString()}`}
                      key={course._id.toString()}
                    >
                      <span>
                        <span className="font-semibold">{course.title}</span>
                        <span className="mt-1 block text-sm text-[var(--muted)]">
                          {course.summary}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-[var(--accent)]">
                        {course.accessLevel}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
