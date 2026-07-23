import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("renders the runnable project skeleton", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "知识产品，自己交付",
    }),
  ).toBeVisible();
  await expect(page.getByText("全站年度会员")).toBeVisible();
  await expect(page.getByText("单课永久访问")).toBeVisible();
});

test("exposes a shallow health endpoint without a database", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    database: {
      status: "not_checked",
    },
  });
});

test("plays a public local MP4 and downloads its material", async ({
  page,
}) => {
  await page.goto("/courses");
  await page.getByRole("link", { name: /从一节公开课开始/ }).click();

  const video = page.locator("video");
  await expect(video).toBeVisible();
  const source = await video.getAttribute("src");
  expect(source).toMatch(/^\/api\/media\/[a-f0-9]{24}\/stream$/);

  const rangeResponse = await page.request.get(source!, {
    headers: { Range: "bytes=0-1023" },
  });
  expect(rangeResponse.status()).toBe(206);
  expect(rangeResponse.headers()["content-range"]).toMatch(
    /^bytes 0-1023\/\d+$/,
  );

  const material = page.getByRole("link", { name: "Demo 课程说明" });
  const materialUrl = await material.getAttribute("href");
  const materialResponse = await page.request.get(materialUrl!);
  expect(materialResponse.ok()).toBe(true);
  expect(materialResponse.headers()["content-disposition"]).toContain(
    "attachment",
  );
});

test("allows the controlled admin account to open the course backend", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("admin@example.com");
  await page.getByLabel("密码").fill("local-demo-admin-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "课程交付后台" }),
  ).toBeVisible();
  await expect(
    page.locator("p").filter({ hasText: "从一节公开课开始" }),
  ).toBeVisible();

  const suffix = Date.now().toString(36);
  const origin = "http://127.0.0.1:3210";
  const seriesResponse = await page.request.post("/api/admin/series", {
    headers: { Origin: origin },
    data: {
      title: `E2E 系列 ${suffix}`,
      slug: `e2e-series-${suffix}`,
      description: "浏览器测试创建的虚构系列。",
      accessLevel: "public",
    },
  });
  expect(seriesResponse.status()).toBe(201);
  const series = (await seriesResponse.json()) as {
    series: { id: string };
  };

  const courseResponse = await page.request.post("/api/admin/courses", {
    headers: { Origin: origin },
    data: {
      seriesId: series.series.id,
      title: `E2E 课时 ${suffix}`,
      slug: `e2e-course-${suffix}`,
      summary: "验证上传、绑定和发布校验。",
      accessLevel: "public",
      position: 0,
    },
  });
  expect(courseResponse.status()).toBe(201);
  const course = (await courseResponse.json()) as {
    course: { id: string };
  };

  const video = await readFile("uploads/demo/public-introduction.mp4");
  const mediaResponse = await page.request.post("/api/admin/media", {
    headers: { Origin: origin },
    multipart: {
      kind: "video",
      file: {
        name: `e2e-${suffix}.mp4`,
        mimeType: "video/mp4",
        buffer: video,
      },
    },
  });
  expect(mediaResponse.status()).toBe(201);
  const media = (await mediaResponse.json()) as {
    asset: { id: string };
  };

  const attachResponse = await page.request.patch(
    `/api/admin/courses/${course.course.id}`,
    {
      headers: { Origin: origin },
      data: { videoAssetId: media.asset.id },
    },
  );
  expect(attachResponse.ok()).toBe(true);

  const publishResponse = await page.request.post(
    `/api/admin/courses/${course.course.id}/publish`,
    { headers: { Origin: origin } },
  );
  expect(publishResponse.ok()).toBe(true);

  await page.goto(`/learn/${course.course.id}`);
  await expect(page.locator("video")).toBeVisible();
});
