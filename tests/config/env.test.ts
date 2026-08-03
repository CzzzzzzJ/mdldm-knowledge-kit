import { describe, expect, it } from "vitest";

import {
  getConfigWarnings,
  isAuthSecretConfigured,
  isInitialSetupTokenConfigured,
  isSelfServiceEmailAvailable,
  parseEnv,
} from "@/config/env";

describe("environment configuration", () => {
  it("provides safe local defaults", () => {
    const env = parseEnv({
      NODE_ENV: "development",
      OSS_ENDPOINT: "",
      OSS_SESSION_TOKEN: "",
      SMTP_PASSWORD: "",
    });

    expect(env.STORAGE_PROVIDER).toBe("local");
    expect(env.PAYMENT_PROVIDER).toBe("manual");
    expect(env.EMAIL_PROVIDER).toBe("console");
    expect(env.FEATURE_MEMBERSHIP).toBe(true);
    expect(env.FEATURE_SINGLE_COURSE).toBe(true);
  });

  it("warns when the development auth secret is missing", () => {
    const env = parseEnv({ NODE_ENV: "development" });

    expect(isAuthSecretConfigured(env)).toBe(false);
    expect(getConfigWarnings(env)).toContainEqual(
      expect.stringContaining("AUTH_SECRET"),
    );
  });

  it("recognizes a usable development auth secret", () => {
    const env = parseEnv({
      NODE_ENV: "development",
      AUTH_SECRET: "a-local-auth-secret-with-at-least-32-characters",
    });

    expect(isAuthSecretConfigured(env)).toBe(true);
  });

  it("only accepts a non-placeholder initial setup token", () => {
    expect(
      isInitialSetupTokenConfigured(
        parseEnv({
          NODE_ENV: "development",
          INITIAL_SETUP_TOKEN: "replace-with-setup-token",
        }),
      ),
    ).toBe(false);

    expect(
      isInitialSetupTokenConfigured(
        parseEnv({
          NODE_ENV: "development",
          INITIAL_SETUP_TOKEN: "one-time-setup-token-2026",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a missing production auth secret", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        AUTH_SECRET: "",
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("accepts a strong production auth secret", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      APP_URL: "https://courses.example.com",
      MONGODB_URI:
        "mongodb+srv://demo.invalid.example/mdldm_knowledge_kit",
      AUTH_SECRET: "a-secure-production-value-with-more-than-32-characters",
      PAYMENT_PROVIDER: "manual",
    });

    expect(env.NODE_ENV).toBe("production");
  });

  it("accepts the four minimum production values with safe provider defaults", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      APP_URL: "https://courses.example.com",
      MONGODB_URI: "mongodb+srv://demo.invalid.example/knowledge",
      AUTH_SECRET: "a-secure-production-value-with-more-than-32-characters",
      INITIAL_SETUP_TOKEN: "one-time-production-setup-token",
    });

    expect(env).toMatchObject({
      STORAGE_PROVIDER: "local",
      EMAIL_PROVIDER: "console",
      PAYMENT_PROVIDER: "manual",
      TRANSCODE_PROVIDER: "none",
      OBSERVABILITY_PROVIDER: "console",
    });
    expect(getConfigWarnings(env)).not.toContainEqual(
      expect.stringContaining("INITIAL_SETUP_TOKEN 未设置"),
    );
  });

  it("warns when a new production deployment cannot initialize its first admin", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      APP_URL: "https://courses.example.com",
      AUTH_SECRET: "a-secure-production-value-with-more-than-32-characters",
    });

    expect(getConfigWarnings(env)).toContainEqual(
      expect.stringContaining("INITIAL_SETUP_TOKEN 未设置"),
    );
  });

  it("does not validate variables that belong to disabled capabilities", () => {
    const env = parseEnv({
      NODE_ENV: "development",
      STORAGE_PROVIDER: "local",
      OSS_REGION: " ",
      EMAIL_PROVIDER: "console",
      SMTP_PORT: "not-a-port",
      PAYMENT_PROVIDER: "manual",
      XORPAY_NOTIFY_URL: "not-a-url",
      OBSERVABILITY_PROVIDER: "console",
      OBSERVABILITY_WEBHOOK_URL: "not-a-url",
      OBSERVABILITY_WEBHOOK_SECRET: "short",
    });

    expect(env.STORAGE_PROVIDER).toBe("local");
    expect(env.SMTP_PORT).toBe(465);
    expect(env.XORPAY_NOTIFY_URL).toBeUndefined();
    expect(env.OBSERVABILITY_WEBHOOK_URL).toBeUndefined();
  });

  it("requires complete OSS and SMTP provider settings", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "oss",
        EMAIL_PROVIDER: "smtp",
      }),
    ).toThrow(/OSS_REGION|EMAIL_FROM/);
  });

  it("rejects mock payments in production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_URL: "https://courses.example.com",
        AUTH_SECRET:
          "a-secure-production-value-with-more-than-32-characters",
        PAYMENT_PROVIDER: "mock",
      }),
    ).toThrow(/Mock Payment/);
  });

  it("requires XorPay credentials when selected", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        PAYMENT_PROVIDER: "xorpay",
      }),
    ).toThrow(/XORPAY_AID|XORPAY_APP_SECRET/);
  });

  it("requires a URL and signing secret for webhook observability", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        OBSERVABILITY_PROVIDER: "webhook",
      }),
    ).toThrow(/OBSERVABILITY_WEBHOOK_URL|OBSERVABILITY_WEBHOOK_SECRET/);

    const env = parseEnv({
      NODE_ENV: "development",
      OBSERVABILITY_PROVIDER: "webhook",
      OBSERVABILITY_WEBHOOK_URL: "https://alerts.example.com/mdldm",
      OBSERVABILITY_WEBHOOK_SECRET: "a-test-secret-with-enough-length",
    });
    expect(env.OBSERVABILITY_PROVIDER).toBe("webhook");
  });

  it("requires HTTPS webhook delivery in production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_URL: "https://courses.example.com",
        AUTH_SECRET:
          "a-secure-production-value-with-more-than-32-characters",
        PAYMENT_PROVIDER: "manual",
        OBSERVABILITY_PROVIDER: "webhook",
        OBSERVABILITY_WEBHOOK_URL: "http://alerts.example.com/mdldm",
        OBSERVABILITY_WEBHOOK_SECRET: "a-test-secret-with-enough-length",
      }),
    ).toThrow(/OBSERVABILITY_WEBHOOK_URL 必须使用 HTTPS/);
  });

  it("rejects provider choices that are outside the public first release", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "s3" }),
    ).toThrow(/local.*oss/);
    expect(() =>
      parseEnv({ NODE_ENV: "development", TRANSCODE_PROVIDER: "ffmpeg" }),
    ).toThrow(/none/);
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        OBSERVABILITY_PROVIDER: "sentry",
      }),
    ).toThrow(/console.*webhook/);
  });

  it("only exposes self-service email in development or with production SMTP", () => {
    expect(
      isSelfServiceEmailAvailable(
        parseEnv({ NODE_ENV: "development", EMAIL_PROVIDER: "console" }),
      ),
    ).toBe(true);
    expect(
      isSelfServiceEmailAvailable(
        parseEnv({
          NODE_ENV: "production",
          APP_URL: "https://courses.example.com",
          AUTH_SECRET:
            "a-secure-production-value-with-more-than-32-characters",
          EMAIL_PROVIDER: "console",
        }),
      ),
    ).toBe(false);
    expect(
      isSelfServiceEmailAvailable(
        parseEnv({
          NODE_ENV: "production",
          APP_URL: "https://courses.example.com",
          AUTH_SECRET:
            "a-secure-production-value-with-more-than-32-characters",
          EMAIL_PROVIDER: "smtp",
          EMAIL_FROM: "hello@example.com",
          SMTP_HOST: "smtp.example.com",
          SMTP_USER: "user",
          SMTP_PASSWORD: "password",
        }),
      ),
    ).toBe(true);
  });
});
