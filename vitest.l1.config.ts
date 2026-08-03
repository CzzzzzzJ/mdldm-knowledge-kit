import { defineTestLayer } from "./vitest.base";

export default defineTestLayer([
  "tests/catalog/content-rules.test.ts",
  "tests/catalog/discovery.test.ts",
  "tests/commerce/domain.test.ts",
  "tests/commerce/product-admin.test.ts",
  "tests/commerce/products.test.ts",
  "tests/config/env.test.ts",
  "tests/entitlement/access.test.ts",
  "tests/entitlement/invitation.test.ts",
  "tests/identity/credentials.test.ts",
  "tests/identity/security.test.ts",
  "tests/media/range.test.ts",
  "tests/media/upload-policy.test.ts",
  "tests/operations/doctor.test.ts",
  "tests/site/agent-context.test.ts",
  "tests/site/initialization.test.ts",
  "tests/site/settings.test.ts",
  "tests/site/theme-system.test.ts",
]);
