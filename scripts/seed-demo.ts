import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import mongoose from "mongoose";

import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";
import { UserModel } from "@/providers/database/mongodb/models/user";
import { getStorageProvider } from "@/providers/storage";

loadEnvConfig(process.cwd());

async function main() {
  await connectMongo();
  const owner = await UserModel.findOne({ role: "admin", status: "active" });
  if (!owner) {
    throw new Error(
      "请先运行 create-admin，再执行 seed-demo，以便为 Demo 媒体记录合法 owner。",
    );
  }

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
      status: "published",
    },
    {
      slug: "member-workflow",
      title: "会员内容交付流程",
      summary: "展示全站会员权益控制的课程。",
      position: 1,
      accessLevel: "member",
      status: "draft",
    },
    {
      slug: "single-course-delivery",
      title: "单课购买与交付",
      summary: "展示指定课程权益控制的内容。",
      position: 2,
      accessLevel: "course",
      status: "draft",
    },
  ] as const;

  const seededCourses = [];
  for (const course of demoCourses) {
    const seededCourse = await CourseModel.findOneAndUpdate(
      { seriesId: series._id, slug: course.slug },
      {
        $set: {
          ...course,
          publishedAt: course.status === "published" ? new Date() : null,
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
    seededCourses.push(seededCourse);
  }

  const publicCourse = seededCourses[0];
  const storage = getStorageProvider();
  const videoObjectKey = "demo/public-introduction.mp4";
  let videoAsset = await MediaAssetModel.findOne({ objectKey: videoObjectKey });

  if (!videoAsset || !(await storage.exists(videoObjectKey))) {
    const temporaryVideo = path.join(
      os.tmpdir(),
      `mdldm-demo-${process.pid}.mp4`,
    );
    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1280x720:rate=30:duration=8",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        temporaryVideo,
      ],
      { stdio: "ignore" },
    );

    if (ffmpeg.status !== 0) {
      throw new Error("生成 Demo MP4 失败，请确认本机已安装 ffmpeg");
    }

    const videoData = await readFile(temporaryVideo);
    await storage.delete(videoObjectKey);
    const storedVideo = await storage.put(videoObjectKey, videoData, {
      mimeType: "video/mp4",
    });
    await unlink(temporaryVideo).catch(() => undefined);

    videoAsset = await MediaAssetModel.findOneAndUpdate(
      { objectKey: videoObjectKey },
      {
        $set: {
          ownerId: owner._id,
          kind: "video",
          status: "ready",
          provider: storage.name,
          originalName: "demo-public-introduction.mp4",
          mimeType: "video/mp4",
          size: storedVideo.size,
          checksum: storedVideo.checksum,
        },
        $setOnInsert: { objectKey: videoObjectKey },
      },
      { upsert: true, new: true, runValidators: true },
    );
  }

  if (!videoAsset) {
    throw new Error("Demo 视频资产创建失败");
  }

  publicCourse.videoAssetId = videoAsset._id;
  await publicCourse.save();

  const materialObjectKey = "demo/public-introduction-notes.txt";
  const materialContent = new TextEncoder().encode(
    "mdldm Knowledge Kit Demo\n\n这是一份完全虚构的课程资料，用于验证安全下载链路。\n",
  );
  if (!(await storage.exists(materialObjectKey))) {
    await storage.put(materialObjectKey, materialContent, {
      mimeType: "text/plain; charset=utf-8",
    });
  }
  const materialAsset = await MediaAssetModel.findOneAndUpdate(
    { objectKey: materialObjectKey },
    {
      $set: {
        ownerId: owner._id,
        kind: "document",
        status: "ready",
        provider: storage.name,
        originalName: "课程说明.txt",
        mimeType: "text/plain; charset=utf-8",
        size: materialContent.byteLength,
        checksum: createHash("sha256").update(materialContent).digest("hex"),
      },
      $setOnInsert: { objectKey: materialObjectKey },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await CourseMaterialModel.findOneAndUpdate(
    { courseId: publicCourse._id, mediaAssetId: materialAsset._id },
    {
      $set: {
        title: "Demo 课程说明",
        position: 0,
        accessLevel: "public",
      },
      $setOnInsert: {
        courseId: publicCourse._id,
        mediaAssetId: materialAsset._id,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  console.log(
    `Demo 数据已就绪：1 个系列，${demoCourses.length} 节课程，1 个视频，1 份资料`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
