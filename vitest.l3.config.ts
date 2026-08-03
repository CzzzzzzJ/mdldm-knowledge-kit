import { defineTestLayer } from "./vitest.base";

export default defineTestLayer([
  "tests/api/checkout-route.test.ts",
  "tests/api/login-route.test.ts",
  "tests/site/public-launch-guard-rendering.test.ts",
]);
