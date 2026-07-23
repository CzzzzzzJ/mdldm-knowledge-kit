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
