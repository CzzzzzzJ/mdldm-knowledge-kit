import { expect, test } from "@playwright/test";
import { createConnection, Types } from "mongoose";

const e2eOrigin = "http://127.0.0.1:3210";

test("publishes a protected article without video and redacts its body", async ({
  page,
}) => {
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const body = `仅授权学员可见的虚构图文正文 ${suffix}\n\n第二段用于验证纯文本安全展示。`;

  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);

  const seriesResponse = await page.request.post("/api/admin/series", {
    headers: { Origin: e2eOrigin },
    data: {
      title: `图文系列 ${suffix}`,
      slug: `article-series-${suffix}`,
      description: "用于验证图文知识付费交付的虚构系列。",
      accessLevel: "registered",
    },
  });
  expect(seriesResponse.status()).toBe(201);
  const series = (await seriesResponse.json()) as {
    series: { id: string };
  };

  const courseResponse = await page.request.post("/api/admin/courses", {
    headers: { Origin: e2eOrigin },
    data: {
      seriesId: series.series.id,
      title: `图文课 ${suffix}`,
      slug: `article-course-${suffix}`,
      summary: "不依赖视频和 OSS 的图文课程。",
      contentType: "article",
      articleBody: body,
      accessLevel: "registered",
      position: 0,
    },
  });
  expect(courseResponse.status()).toBe(201);
  const course = (await courseResponse.json()) as {
    course: { id: string };
  };

  const publish = await page.request.post(
    `/api/admin/courses/${course.course.id}/publish`,
    { headers: { Origin: e2eOrigin } },
  );
  expect(publish.ok(), await publish.text()).toBe(true);

  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  await page.goto(`/learn/${course.course.id}`);
  await expect(
    page.getByRole("heading", { name: "这节课需要有效权益" }),
  ).toBeVisible();
  await expect(page.getByText(body.split("\n")[0], { exact: true })).toHaveCount(
    0,
  );
  expect(await page.content()).not.toContain(body.split("\n")[0]);

  const email = `article-reader-${suffix}@example.com`;
  const password = "article-reader-password-2026";
  const registration = await page.request.post("/api/auth/register", {
    headers: { Origin: e2eOrigin },
    data: { name: "图文学员", email, password },
  });
  expect(registration.status()).toBe(201);
  const registered = (await registration.json()) as {
    user: { id: string };
  };

  const database = await createConnection(process.env.MONGODB_URI!).asPromise();
  await database.collection("users").updateOne(
    { _id: new Types.ObjectId(registered.user.id) },
    { $set: { emailVerified: true, updatedAt: new Date() } },
  );
  await database.close();

  const learnerLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: { email, password },
  });
  expect(learnerLogin.ok()).toBe(true);
  await page.goto(`/learn/${course.course.id}`);
  await expect(page.getByTestId("article-body")).toContainText(
    body.split("\n")[0],
  );
  await expect(page.locator("video")).toHaveCount(0);
});
