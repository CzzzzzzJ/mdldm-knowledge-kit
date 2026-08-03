import { defineTestLayer } from "./vitest.base";

export default defineTestLayer([
  "tests/architecture/application-boundaries.test.ts",
  "tests/architecture/test-layer-registration.test.ts",
  "tests/catalog/query-service.test.ts",
  "tests/catalog/publish-service.test.ts",
  "tests/commerce/checkout-product-source.test.ts",
  "tests/config/provider-readiness.test.ts",
  "tests/learning/query-service.test.ts",
  "tests/operations/issue-templates.test.ts",
  "tests/operations/observability.test.ts",
  "tests/payment/provider-contract.test.ts",
  "tests/payment/xorpay.test.ts",
  "tests/site/local-quickstart.test.ts",
  "tests/site/quickstart-docs.test.ts",
  "tests/site/serverless-readiness.test.ts",
  "tests/site/setup-guide.test.ts",
  "tests/storage/local.test.ts",
]);
