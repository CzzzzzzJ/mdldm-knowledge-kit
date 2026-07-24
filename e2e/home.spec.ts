import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import { createConnection, Types } from "mongoose";

import { hashInvitationCode } from "@/modules/entitlement/invitation";
import { hashOpaqueToken } from "@/modules/identity/credentials";

const e2eOrigin = "http://127.0.0.1:3210";

test("renders the runnable project skeleton", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );

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
  const seriesResponse = await page.request.post("/api/admin/series", {
    headers: { Origin: e2eOrigin },
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
    headers: { Origin: e2eOrigin },
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
  const uploadTicket = await page.request.post(
    "/api/admin/media/upload-ticket",
    {
      headers: { Origin: e2eOrigin },
      data: {
        kind: "video",
        originalName: `e2e-${suffix}.mp4`,
        mimeType: "video/mp4",
        size: video.byteLength,
      },
    },
  );
  expect(uploadTicket.ok()).toBe(true);
  await expect(uploadTicket.json()).resolves.toMatchObject({ mode: "proxy" });

  const mediaResponse = await page.request.post("/api/admin/media", {
    headers: { Origin: e2eOrigin },
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
      headers: { Origin: e2eOrigin },
      data: { videoAssetId: media.asset.id },
    },
  );
  expect(attachResponse.ok()).toBe(true);

  const publishResponse = await page.request.post(
    `/api/admin/courses/${course.course.id}/publish`,
    { headers: { Origin: e2eOrigin } },
  );
  expect(publishResponse.ok()).toBe(true);

  await page.goto(`/learn/${course.course.id}`);
  await expect(page.locator("video")).toBeVisible();
});

test("enforces verified identity, invitation entitlement and password rotation", async ({
  page,
}) => {
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const email = `learner-${suffix}@example.com`;
  const password = "learner-password-2026";
  const newPassword = "learner-password-2027";
  const resetPassword = "learner-password-2028";

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("admin@example.com");
  await page.getByLabel("密码").fill("local-demo-admin-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const seriesResponse = await page.request.post("/api/admin/series", {
    headers: { Origin: e2eOrigin },
    data: {
      title: `受控系列 ${suffix}`,
      slug: `protected-series-${suffix}`,
      description: "验证未授权用户无法访问课程媒体。",
      accessLevel: "course",
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
      title: `受控课时 ${suffix}`,
      slug: `protected-course-${suffix}`,
      summary: "只有邀请码授予的单课权益可以访问。",
      accessLevel: "course",
      position: 0,
    },
  });
  expect(courseResponse.status()).toBe(201);
  const course = (await courseResponse.json()) as {
    course: { id: string };
  };

  const video = await readFile("uploads/demo/public-introduction.mp4");
  const mediaResponse = await page.request.post("/api/admin/media", {
    headers: { Origin: e2eOrigin },
    multipart: {
      kind: "video",
      file: {
        name: `protected-${suffix}.mp4`,
        mimeType: "video/mp4",
        buffer: video,
      },
    },
  });
  expect(mediaResponse.status()).toBe(201);
  const media = (await mediaResponse.json()) as {
    asset: { id: string };
  };

  expect(
    (
      await page.request.patch(`/api/admin/courses/${course.course.id}`, {
        headers: { Origin: e2eOrigin },
        data: { videoAssetId: media.asset.id },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(
        `/api/admin/courses/${course.course.id}/publish`,
        { headers: { Origin: e2eOrigin } },
      )
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/auth/logout", {
        headers: { Origin: e2eOrigin },
      })
    ).ok(),
  ).toBe(true);

  const injectedRole = await page.request.post("/api/auth/register", {
    headers: { Origin: e2eOrigin },
    data: {
      name: "Injected Admin",
      email: `injected-${email}`,
      password,
      role: "admin",
    },
  });
  expect(injectedRole.status()).toBe(400);

  const registration = await page.request.post("/api/auth/register", {
    headers: { Origin: e2eOrigin },
    data: {
      name: "Demo Learner",
      email,
      password,
    },
  });
  expect(registration.status()).toBe(201);
  const registered = (await registration.json()) as {
    user: { id: string; role: string; emailVerified: boolean };
  };
  expect(registered.user).toMatchObject({
    role: "user",
    emailVerified: false,
  });

  const unverifiedLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: { email, password },
  });
  expect(unverifiedLogin.status()).toBe(403);

  const e2eSecret =
    process.env.AUTH_SECRET ??
    "playwright-local-secret-value-with-more-than-32-characters";
  const database = await createConnection(
    process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/mdldm_knowledge_kit",
  ).asPromise();
  const users = database.collection("users");
  const identityTokens = database.collection("identitytokens");
  const invitations = database.collection("invitations");
  const entitlements = database.collection("entitlements");
  const verificationToken = `verification-${suffix}-token-value`;
  await identityTokens.insertOne({
    userId: new Types.ObjectId(registered.user.id),
    purpose: "verify_email",
    tokenHash: hashOpaqueToken(verificationToken, e2eSecret),
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  expect(
    (
      await page.request.post("/api/auth/verify-email", {
        headers: { Origin: e2eOrigin },
        data: { token: verificationToken },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/auth/verify-email", {
        headers: { Origin: e2eOrigin },
        data: { token: verificationToken },
      })
    ).status(),
  ).toBe(400);

  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/courses$/);

  await page.goto(`/learn/${course.course.id}`);
  await expect(
    page.getByRole("heading", { name: "这节课需要有效权益" }),
  ).toBeVisible();
  expect(
    (
      await page.request.get(
        `/api/media/${media.asset.id}/stream`,
        { headers: { Range: "bytes=0-1023" } },
      )
    ).status(),
  ).toBe(403);

  const invitationCode = `MDLDM-E2E-${suffix}`;
  const admin = await users.findOne({ role: "admin", status: "active" });
  expect(admin).not.toBeNull();
  await invitations.insertOne({
    codeHash: hashInvitationCode(
      invitationCode,
      e2eSecret,
    ),
    codeHint: "MDLDM-E2E…TEST",
    entitlementType: "course",
    targetId: course.course.id,
    durationDays: null,
    maxRedemptions: 1,
    redemptionCount: 0,
    status: "active",
    expiresAt: null,
    createdBy: admin!._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const redemption = await page.request.post("/api/entitlements/redeem", {
    headers: { Origin: e2eOrigin },
    data: { code: invitationCode },
  });
  expect(redemption.ok()).toBe(true);
  expect(
    await entitlements.countDocuments({
      userId: new Types.ObjectId(registered.user.id),
      type: "course",
      targetId: course.course.id,
      revokedAt: null,
    }),
  ).toBe(1);

  await page.goto(`/learn/${course.course.id}`);
  await expect(page.locator("video")).toBeVisible();
  expect(
    (
      await page.request.get(
        `/api/media/${media.asset.id}/stream`,
        { headers: { Range: "bytes=0-1023" } },
      )
    ).status(),
  ).toBe(206);

  const changed = await page.request.post("/api/auth/change-password", {
    headers: { Origin: e2eOrigin },
    data: {
      currentPassword: password,
      newPassword,
    },
  });
  expect(changed.ok()).toBe(true);
  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password: newPassword },
      })
    ).ok(),
  ).toBe(true);

  const resetToken = `password-reset-${suffix}-token-value`;
  await identityTokens.insertOne({
    userId: new Types.ObjectId(registered.user.id),
    purpose: "reset_password",
    tokenHash: hashOpaqueToken(resetToken, e2eSecret),
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  expect(
    (
      await page.request.post("/api/auth/reset-password", {
        headers: { Origin: e2eOrigin },
        data: { token: resetToken, password: resetPassword },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/auth/reset-password", {
        headers: { Origin: e2eOrigin },
        data: { token: resetToken, password: "another-password-2029" },
      })
    ).status(),
  ).toBe(400);
  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password: newPassword },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password: resetPassword },
      })
    ).ok(),
  ).toBe(true);

  await database.close();
});
