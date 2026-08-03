import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createConnection, Types } from "mongoose";

import { reportOperationalFailure } from "@/app/lib/operations-service";
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
      name: "把 AI 学会，也把它做成作品",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "开始学习" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "从一个完整系列开始" }),
  ).toBeVisible();
});

test("keeps the operator setup journey inside the current knowledge site", async ({
  page,
}) => {
  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);

  await page.goto("/setup");
  await expect(page).toHaveURL(/\/admin\/setup$/);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "先知道整条路，再开始填配置",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "为什么要做这一步" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "交给 Codex 或 Agent" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /连接 MongoDB/ })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "让用户、订单和学习进度有可靠的家",
    }),
  ).toBeVisible();
  await expect(page.getByText("MONGODB_URI", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "复制 Prompt" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();

  const [progressResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/setup/progress") &&
        response.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: "确认完成这项任务" }).click(),
  ]);
  expect(
    progressResponse.ok(),
    await progressResponse.text(),
  ).toBe(true);
  await page.reload();
  await expect(page.getByText("开站任务 1/8")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "已完成这项任务" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "开站指南" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "站长后台" }),
  ).toHaveCount(0);
});

test("discovers a series through search and tags", async ({ page }) => {
  await page.goto("/courses?q=创作者");

  await expect(
    page.getByRole("heading", { level: 1, name: "找到适合你的课程" }),
  ).toBeVisible();
  await expect(page.locator('input[name="q"]')).toHaveValue("创作者");

  await page
    .getByRole("link", { name: "创作者知识产品入门", exact: true })
    .click();
  await expect(page).toHaveURL(/\/series\/creator-foundations$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "创作者知识产品入门",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Vibe Coding", exact: true }).click();
  await expect(page).toHaveURL(/\/tags\/Vibe%20Coding$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Vibe Coding" }),
  ).toBeVisible();
});

test("exposes a shallow health endpoint without a database", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    version: "0.1.0",
    database: {
      status: "not_checked",
    },
  });

  expect((await request.get("/api/admin/operations/summary")).status()).toBe(
    403,
  );
  expect((await request.get("/api/admin/export")).status()).toBe(403);

  const duplicateAdmin = await request.post("/api/setup/initialize", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "second-admin@example.com",
      emailConfirmation: "second-admin@example.com",
    },
  });
  expect(duplicateAdmin.status()).toBe(409);
  await expect(duplicateAdmin.json()).resolves.toMatchObject({
    code: "ADMIN_ALREADY_EXISTS",
  });
});

test("publishes administrator site settings to the public homepage", async ({
  page,
}) => {
  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);

  const currentResponse = await page.request.get("/api/admin/site");
  expect(currentResponse.ok()).toBe(true);
  const currentPayload = (await currentResponse.json()) as {
    settings: {
      siteName: string;
      description: string;
      creatorName: string;
      creatorBio: string;
      supportEmail: string;
      homeTitle: string;
      homeSubtitle: string;
      avatarUrl: string | null;
      heroImageUrl: string | null;
      socialLinks: Array<{ label: string; url: string }>;
    };
  };
  const current = currentPayload.settings;
  const original = {
    siteName: current.siteName,
    description: current.description,
    creatorName: current.creatorName,
    creatorBio: current.creatorBio,
    supportEmail: current.supportEmail,
    homeTitle: current.homeTitle,
    homeSubtitle: current.homeSubtitle,
    avatarUrl: current.avatarUrl,
    heroImageUrl: current.heroImageUrl,
    socialLinks: current.socialLinks,
  };
  const title = `E2E 知识站 ${Date.now().toString(36)}`;

  try {
    const update = await page.request.patch("/api/admin/site", {
      headers: { Origin: e2eOrigin },
      data: { homeTitle: title },
    });
    expect(update.ok()).toBe(true);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
  } finally {
    const restore = await page.request.patch("/api/admin/site", {
      headers: { Origin: e2eOrigin },
      data: original,
    });
    expect(restore.ok()).toBe(true);
  }
});

test("shows operational metrics, failure queue and protected data export", async ({
  page,
}) => {
  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);

  const database = await createConnection(
    process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/mdldm_knowledge_kit",
  ).asPromise();
  const suffix = Date.now().toString(36);
  const failureId = await reportOperationalFailure({
    category: "storage",
    severity: "error",
    code: "E2E_STORAGE_FAILURE",
    summary: "E2E 虚构存储故障",
    error: "仅用于验证管理员故障队列。",
    provider: "local",
    sourceType: "test",
    sourceId: suffix,
  });
  expect(failureId).not.toBeNull();
  const repeatedFailureId = await reportOperationalFailure({
    category: "storage",
    severity: "error",
    code: "E2E_STORAGE_FAILURE",
    summary: "E2E 虚构存储故障",
    error: "重复发生时应聚合到同一条记录。",
    provider: "local",
    sourceType: "test",
    sourceId: suffix,
  });
  expect(repeatedFailureId).toBe(failureId);
  expect(
    await database.collection("operationfailures").countDocuments({
      _id: new Types.ObjectId(failureId!),
      occurrenceCount: 2,
    }),
  ).toBe(1);

  await page.goto("/admin/system");
  await expect(
    page.getByRole("heading", { name: "运营与故障总览" }),
  ).toBeVisible();
  await expect(page.getByText("E2E 虚构存储故障")).toBeVisible();

  const summary = await page.request.get("/api/admin/operations/summary");
  expect(summary.ok()).toBe(true);
  await expect(summary.json()).resolves.toMatchObject({
    metrics: {
      users: expect.any(Number),
      courses: expect.any(Number),
      openFailures: expect.any(Number),
    },
  });

  const exported = await page.request.get("/api/admin/export");
  expect(exported.ok()).toBe(true);
  expect(exported.headers()["content-disposition"]).toContain(
    "mdldm-admin-export",
  );
  const exportBody = await exported.text();
  expect(exportBody).toContain('"schemaVersion": "1"');
  expect(exportBody).not.toContain("passwordHash");
  expect(exportBody).not.toContain("tokenHash");

  const resolve = await page.request.post(
    `/api/admin/operations/failures/${failureId}/resolve`,
    {
      headers: { Origin: e2eOrigin },
      data: { note: "E2E 已确认恢复" },
    },
  );
  expect(resolve.ok()).toBe(true);
  expect(
    await database.collection("operationfailures").countDocuments({
      _id: new Types.ObjectId(failureId!),
      status: "resolved",
    }),
  ).toBe(1);
  await database.collection("operationfailures").deleteOne({
    _id: new Types.ObjectId(failureId!),
  });
  await database.close();
});

test("plays a public local MP4 and downloads its material", async ({
  page,
}) => {
  await page.goto("/courses");
  await page
    .getByRole("link", { name: "创作者知识产品入门", exact: true })
    .click();
  await page.getByRole("link", { name: "开始学习", exact: true }).click();

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
  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);
  await page.goto("/admin/catalog");
  await expect(
    page.getByRole("heading", { name: "内容管理" }),
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

  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);
  await page.goto("/admin");

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
  const verificationResponse = await page.request.post(
    "/api/auth/verify-email",
    {
      headers: { Origin: e2eOrigin },
      data: { token: verificationToken },
    },
  );
  expect(
    verificationResponse.ok(),
    await verificationResponse.text(),
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

test("creates server-priced mock orders and grants both payment entitlement modes idempotently", async ({
  page,
}) => {
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const email = `buyer-${suffix}@example.com`;
  const password = "buyer-password-2026";

  const registration = await page.request.post("/api/auth/register", {
    headers: { Origin: e2eOrigin },
    data: { name: "Demo Buyer", email, password },
  });
  expect(registration.status()).toBe(201);
  const registered = (await registration.json()) as {
    user: { id: string };
  };

  const database = await createConnection(
    process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/mdldm_knowledge_kit",
  ).asPromise();
  await database.collection("users").updateOne(
    { _id: new Types.ObjectId(registered.user.id) },
    { $set: { emailVerified: true, updatedAt: new Date() } },
  );

  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password },
      })
    ).ok(),
  ).toBe(true);

  const productsResponse = await page.request.get("/api/products");
  expect(productsResponse.ok()).toBe(true);
  await expect(productsResponse.json()).resolves.toMatchObject({
    provider: "mock",
    paymentMethods: ["mock"],
    products: expect.arrayContaining([
      expect.objectContaining({ id: "membership-yearly" }),
      expect.objectContaining({ id: "course-demo-foundations" }),
    ]),
  });

  const tampered = await page.request.post("/api/checkout", {
    headers: { Origin: e2eOrigin },
    data: {
      productId: "course-demo-foundations",
      paymentMethod: "mock",
      amountInMinorUnits: 1,
    },
  });
  expect(tampered.status()).toBe(400);

  const createdOrderIds: string[] = [];
  for (const productId of [
    "course-demo-foundations",
    "membership-yearly",
  ]) {
    const checkout = await page.request.post("/api/checkout", {
      headers: { Origin: e2eOrigin },
      data: { productId, paymentMethod: "mock" },
    });
    expect(checkout.status()).toBe(201);
    const payload = (await checkout.json()) as {
      order: { id: string; amountInMinorUnits: number };
      checkout: { mode: string };
    };
    expect(payload.checkout.mode).toBe("mock");
    expect(payload.order.amountInMinorUnits).toBe(
      productId === "membership-yearly" ? 49_900 : 9_900,
    );
    createdOrderIds.push(payload.order.id);

    const firstConfirmation = await page.request.post(
      `/api/payments/mock/${payload.order.id}/confirm`,
      { headers: { Origin: e2eOrigin } },
    );
    expect(firstConfirmation.ok()).toBe(true);
    await expect(firstConfirmation.json()).resolves.toMatchObject({
      confirmed: true,
      alreadyProcessed: false,
    });

    const duplicateConfirmation = await page.request.post(
      `/api/payments/mock/${payload.order.id}/confirm`,
      { headers: { Origin: e2eOrigin } },
    );
    expect(duplicateConfirmation.ok()).toBe(true);
    await expect(duplicateConfirmation.json()).resolves.toMatchObject({
      confirmed: true,
      alreadyProcessed: true,
    });
  }

  for (const orderId of createdOrderIds) {
    const order = await page.request.get(`/api/orders/${orderId}`);
    expect(order.ok()).toBe(true);
    await expect(order.json()).resolves.toMatchObject({
      order: {
        status: "fulfilled",
        fulfillmentStatus: "fulfilled",
        items: [expect.objectContaining({ entitlementGranted: true })],
      },
    });
  }

  const entitlements = database.collection("entitlements");
  expect(
    await entitlements.countDocuments({
      userId: new Types.ObjectId(registered.user.id),
      sourceType: "order",
    }),
  ).toBe(2);
  expect(
    await entitlements
      .find({
        userId: new Types.ObjectId(registered.user.id),
        sourceType: "order",
      })
      .project({ type: 1 })
      .toArray(),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "course" }),
      expect.objectContaining({ type: "membership" }),
    ]),
  );

  const paidCourse = await database
    .collection("courses")
    .findOne({ slug: "single-course-delivery" });
  expect(paidCourse).not.toBeNull();
  await page.goto(`/learn/${paidCourse!._id.toString()}`);
  await expect(page.locator("video")).toBeVisible();

  await database.close();
});

test("initializes administrator 1 with a one-time temporary credential", async ({
  page,
}) => {
  const database = await createConnection(
    process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/mdldm_knowledge_kit",
  ).asPromise();
  const users = database.collection("users");
  const sessions = database.collection("sessions");
  const initializations = database.collection("siteinitializations");

  const previousAdmins = await users
    .find({ role: "admin" })
    .project({ _id: 1 })
    .toArray();
  await sessions.deleteMany({
    userId: { $in: previousAdmins.map((admin) => admin._id) },
  });
  await users.deleteMany({ role: "admin" });
  await initializations.deleteMany({ singletonKey: "default" });

  const concurrentPayloads = [
    {
      email: "first-concurrent-admin@example.com",
      emailConfirmation: "first-concurrent-admin@example.com",
    },
    {
      email: "second-concurrent-admin@example.com",
      emailConfirmation: "second-concurrent-admin@example.com",
    },
  ];
  const concurrentResponses = await Promise.all(
    concurrentPayloads.map((data, index) =>
      page.request.post("/api/setup/initialize", {
        headers: {
          Origin: e2eOrigin,
          "x-forwarded-for": `203.0.113.${index + 10}`,
        },
        data,
      }),
    ),
  );
  expect(concurrentResponses.map((response) => response.status()).sort()).toEqual([
    201,
    409,
  ]);
  expect(await users.countDocuments({ role: "admin" })).toBe(1);

  const concurrentAdmins = await users
    .find({ role: "admin" })
    .project({ _id: 1 })
    .toArray();
  await sessions.deleteMany({
    userId: { $in: concurrentAdmins.map((admin) => admin._id) },
  });
  await users.deleteMany({ role: "admin" });
  await initializations.deleteMany({ singletonKey: "default" });

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "用你的邮箱创建管理员 1 号",
    }),
  ).toBeVisible();

  await page.locator('input[name="email"]').fill("admin@example.com");
  await page
    .locator('input[name="emailConfirmation"]')
    .fill("wrong-admin@example.com");
  await page.getByRole("button", { name: "确认邮箱并创建管理员 1 号" }).click();
  await expect(page.getByText("两次输入的邮箱不一致")).toBeVisible();

  await page
    .locator('input[name="emailConfirmation"]')
    .fill("admin@example.com");
  const [initializeResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/setup/initialize") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "确认邮箱并创建管理员 1 号" }).click(),
  ]);
  expect(initializeResponse.status()).toBe(201);
  expect(initializeResponse.headers()["cache-control"]).toContain("no-store");
  const initializePayload = (await initializeResponse.json()) as {
    sessionCreated: boolean;
    temporaryPassword: string;
    next: string;
    user: { email: string };
  };
  expect(initializePayload.next).toBe("/admin/activate");
  expect(initializePayload.sessionCreated).toBe(true);
  expect(initializePayload.user.email).toBe("admin@example.com");
  expect(initializePayload.temporaryPassword).toMatch(
    /^MK1-[A-Za-z0-9_-]{24}$/,
  );
  await expect(page.getByText("管理员 1 号已创建")).toBeVisible();
  await expect(page.getByTestId("temporary-admin-password")).toHaveText(
    initializePayload.temporaryPassword,
  );
  const persistedBrowserState = await page.evaluate(() =>
    JSON.stringify({
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    }),
  );
  expect(persistedBrowserState).not.toContain(
    initializePayload.temporaryPassword,
  );

  const storedAdmin = await users.findOne(
    { email: "admin@example.com" },
    { projection: { passwordHash: 1, requiresPasswordChange: 1 } },
  );
  expect(storedAdmin?.requiresPasswordChange).toBe(true);
  expect(storedAdmin).not.toHaveProperty("temporaryPassword");
  expect(storedAdmin?.passwordHash).not.toBe(initializePayload.temporaryPassword);
  expect(
    await bcrypt.compare(
      initializePayload.temporaryPassword,
      String(storedAdmin?.passwordHash),
    ),
  ).toBe(true);

  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  await page.goto("/login?next=/admin/setup");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page
    .locator('input[name="password"]')
    .fill(initializePayload.temporaryPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin\/activate$/);

  expect((await page.request.get("/api/admin/site")).status()).toBe(403);
  const genericPasswordChange = await page.request.post(
    "/api/auth/change-password",
    {
      headers: { Origin: e2eOrigin },
      data: {
        currentPassword: initializePayload.temporaryPassword,
        newPassword: "must-not-bypass-activation-2026",
      },
    },
  );
  expect(genericPasswordChange.status()).toBe(409);
  await expect(genericPasswordChange.json()).resolves.toMatchObject({
    code: "PASSWORD_CHANGE_REQUIRED",
  });
  await page.goto("/admin/setup");
  await expect(page).toHaveURL(/\/admin\/activate$/);
  await expect(
    page.getByText(initializePayload.temporaryPassword, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "用你自己的正式密码接管后台",
    }),
  ).toBeVisible();

  const permanentPassword = "local-demo-admin-password-2026";
  await page.locator('input[name="password"]').fill(permanentPassword);
  await page
    .locator('input[name="passwordConfirmation"]')
    .fill(permanentPassword);
  const [activationResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/setup/activate-admin") &&
        response.request().method() === "POST",
    ),
    page
      .getByRole("button", { name: "保存正式密码并进入开站指南" })
      .click(),
  ]);
  expect(activationResponse.ok()).toBe(true);
  expect(activationResponse.headers()["cache-control"]).toContain("no-store");
  await expect(page).toHaveURL(/\/admin\/setup$/);

  const activatedAdmin = await users.findOne(
    { email: "admin@example.com" },
    { projection: { _id: 1, passwordHash: 1, requiresPasswordChange: 1 } },
  );
  expect(activatedAdmin?.requiresPasswordChange).toBe(false);
  expect(
    await bcrypt.compare(
      initializePayload.temporaryPassword,
      String(activatedAdmin?.passwordHash),
    ),
  ).toBe(false);
  expect(
    await bcrypt.compare(permanentPassword, String(activatedAdmin?.passwordHash)),
  ).toBe(true);

  const duplicate = await page.request.post("/api/setup/initialize", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "another-admin@example.com",
      emailConfirmation: "another-admin@example.com",
    },
  });
  expect(duplicate.status()).toBe(409);
  await expect(duplicate.json()).resolves.toMatchObject({
    code: "ADMIN_ALREADY_EXISTS",
  });

  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: {
          email: "admin@example.com",
          password: initializePayload.temporaryPassword,
        },
      })
    ).status(),
  ).toBe(401);
  const permanentLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: { email: "admin@example.com", password: permanentPassword },
  });
  expect(permanentLogin.ok()).toBe(true);
  await expect(permanentLogin.json()).resolves.toMatchObject({
    user: { role: "admin", requiresPasswordChange: false },
  });

  await initializations.updateOne(
    { singletonKey: "default" },
    {
      $set: {
        status: "live",
        ownerAdminId: activatedAdmin!._id,
        launchedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );
  await database.close();
});
