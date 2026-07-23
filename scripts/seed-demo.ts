import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

loadEnvConfig(process.cwd());

async function main() {
  await connectMongo();

  const series = await SeriesModel.findOneAndUpdate(
    { slug: "creator-foundations" },
    {
      $set: {
        title: "创作者知识产品入门",
        description: "一套完全虚构的 Demo 系列，用于验证发布与学习闭环。",
        status: "published",
        accessLevel: "public",
      },
      $setOnInsert: {
        slug: "creator-foundations",
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  const demoCourses = [
    {
      slug: "public-introduction",
      title: "从一节公开课开始",
      summary: "展示无需登录即可访问的公开内容。",
      position: 0,
      accessLevel: "public",
    },
    {
      slug: "member-workflow",
      title: "会员内容交付流程",
      summary: "展示全站会员权益控制的课程。",
      position: 1,
      accessLevel: "member",
    },
    {
      slug: "single-course-delivery",
      title: "单课购买与交付",
      summary: "展示指定课程权益控制的内容。",
      position: 2,
      accessLevel: "course",
    },
  ] as const;

  for (const course of demoCourses) {
    await CourseModel.findOneAndUpdate(
      { seriesId: series._id, slug: course.slug },
      {
        $set: {
          ...course,
          status: "published",
        },
        $setOnInsert: {
          seriesId: series._id,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );
  }

  console.log(`Demo 数据已就绪：1 个系列，${demoCourses.length} 节课程`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
