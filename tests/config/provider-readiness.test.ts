import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PublicRuntimeConfig } from "@/config/env";
import { getProviderReadiness } from "@/providers/readiness";

function runtime(
  overrides: Partial<PublicRuntimeConfig["providers"]> = {},
  environment: PublicRuntimeConfig["environment"] = "development",
): PublicRuntimeConfig {
  return {
    appName: "Test",
    appUrl: "http://localhost:3000",
    environment,
    providers: {
      storage: "local",
      email: "console",
      payment: "manual",
      transcode: "none",
      observability: "console",
      ...overrides,
    },
  };
}

describe("provider capability readiness", () => {
  it("reports minimum providers as usable or explicitly limited without secrets", () => {
    const readiness = getProviderReadiness(runtime());

    expect(readiness.payment).toMatchObject({
      provider: "manual",
      status: "ready",
      enabled: true,
      external: false,
      requiredEnv: [],
    });
    expect(readiness.storage.status).toBe("limited");
    expect(readiness.transcode.status).toBe("disabled");
    expect(JSON.stringify(readiness)).not.toMatch(
      /mongodb\+srv|accessKeySecret|password=/i,
    );
  });

  it("marks production Console Email as disabled with exact enable variables", () => {
    const readiness = getProviderReadiness(runtime({}, "production"));

    expect(readiness.email).toMatchObject({
      status: "disabled",
      enabled: false,
      requiredEnv: [
        "EMAIL_PROVIDER",
        "EMAIL_FROM",
        "SMTP_HOST",
        "SMTP_USER",
        "SMTP_PASSWORD",
      ],
    });
  });

  it("reports enabled external providers as ready", () => {
    const readiness = getProviderReadiness(
      runtime({
        storage: "oss",
        email: "smtp",
        payment: "xorpay",
        observability: "webhook",
      }),
    );

    expect(readiness.storage.status).toBe("ready");
    expect(readiness.email.external).toBe(true);
    expect(readiness.payment.requiredEnv).toContain("XORPAY_APP_SECRET");
    expect(readiness.observability.requiredEnv).toContain(
      "OBSERVABILITY_WEBHOOK_SECRET",
    );
  });
});

describe("optional provider SDK loading", () => {
  it("keeps OSS and SMTP implementations behind dynamic imports", async () => {
    const [storageSelector, emailSelector] = await Promise.all([
      readFile(path.join(process.cwd(), "providers/storage/index.ts"), "utf8"),
      readFile(path.join(process.cwd(), "providers/email/index.ts"), "utf8"),
    ]);

    expect(storageSelector).not.toMatch(
      /import\s+\{\s*ossStorageProvider\s*\}\s+from/,
    );
    expect(storageSelector).toContain(
      'await import("@/providers/storage/oss")',
    );
    expect(emailSelector).not.toMatch(
      /import\s+\{\s*smtpEmailProvider\s*\}\s+from/,
    );
    expect(emailSelector).toContain(
      'await import("@/providers/email/smtp")',
    );
  });
});
