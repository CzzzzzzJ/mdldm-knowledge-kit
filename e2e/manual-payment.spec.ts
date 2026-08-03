import { expect, test } from "@playwright/test";
import { createConnection, Types } from "mongoose";

const e2eOrigin = "http://127.0.0.1:3211";

test("keeps manual orders pending until an administrator confirms payment", async ({
  page,
}) => {
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const email = `manual-buyer-${suffix}@example.com`;
  const password = "manual-buyer-password-2026";

  const registration = await page.request.post("/api/auth/register", {
    headers: { Origin: e2eOrigin },
    data: { name: "人工支付学员", email, password },
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

  const learnerLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: { email, password },
  });
  expect(learnerLogin.ok()).toBe(true);

  const products = await page.request.get("/api/products");
  await expect(products.json()).resolves.toMatchObject({
    provider: "manual",
    paymentMethods: ["manual"],
  });

  const checkout = await page.request.post("/api/checkout", {
    headers: { Origin: e2eOrigin },
    data: { productId: "membership-yearly", paymentMethod: "manual" },
  });
  expect(checkout.status()).toBe(201);
  const payload = (await checkout.json()) as {
    order: { id: string; amountInMinorUnits: number };
    checkout: { mode: string; instructions: string | null };
  };
  expect(payload.order.amountInMinorUnits).toBe(49_900);
  expect(payload.checkout.mode).toBe("instructions");
  expect(payload.checkout.instructions).toBeTruthy();
  expect(
    await database.collection("entitlements").countDocuments({
      userId: new Types.ObjectId(registered.user.id),
      sourceType: "order",
    }),
  ).toBe(0);

  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  const adminLogin = await page.request.post("/api/auth/login", {
    headers: { Origin: e2eOrigin },
    data: {
      email: "admin@example.com",
      password: "local-demo-admin-password-2026",
    },
  });
  expect(adminLogin.ok()).toBe(true);

  const firstConfirmation = await page.request.post(
    `/api/admin/orders/${payload.order.id}/confirm`,
    { headers: { Origin: e2eOrigin } },
  );
  expect(firstConfirmation.ok()).toBe(true);
  await expect(firstConfirmation.json()).resolves.toMatchObject({
    confirmed: true,
    alreadyProcessed: false,
  });

  const duplicateConfirmation = await page.request.post(
    `/api/admin/orders/${payload.order.id}/confirm`,
    { headers: { Origin: e2eOrigin } },
  );
  expect(duplicateConfirmation.ok()).toBe(true);
  await expect(duplicateConfirmation.json()).resolves.toMatchObject({
    confirmed: true,
    alreadyProcessed: true,
  });
  expect(
    await database.collection("entitlements").countDocuments({
      userId: new Types.ObjectId(registered.user.id),
      type: "membership",
      sourceType: "order",
      revokedAt: null,
    }),
  ).toBe(1);

  await page.request.post("/api/auth/logout", {
    headers: { Origin: e2eOrigin },
  });
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: e2eOrigin },
        data: { email, password },
      })
    ).ok(),
  ).toBe(true);
  const order = await page.request.get(`/api/orders/${payload.order.id}`);
  expect(order.ok()).toBe(true);
  await expect(order.json()).resolves.toMatchObject({
    order: {
      status: "fulfilled",
      fulfillmentStatus: "fulfilled",
      items: [expect.objectContaining({ entitlementGranted: true })],
    },
  });
  await page.goto("/account");
  await expect(page.getByText("当前有效", { exact: true })).toBeVisible();
  await database.close();
});
