import { describe, expect, it } from "vitest";

import { getConfigWarnings, parseEnv } from "@/config/env";

describe("environment configuration", () => {
  it("provides safe local defaults", () => {
    const env = parseEnv({
      NODE_ENV: "development",
      OSS_ENDPOINT: "",
      OSS_SESSION_TOKEN: "",
      SMTP_PASSWORD: "",
    });

    expect(env.STORAGE_PROVIDER).toBe("local");
    expect(env.PAYMENT_PROVIDER).toBe("mock");
    expect(env.EMAIL_PROVIDER).toBe("console");
    expect(env.FEATURE_MEMBERSHIP).toBe(true);
    expect(env.FEATURE_SINGLE_COURSE).toBe(true);
  });

  it("warns when the development auth secret is missing", () => {
    const env = parseEnv({ NODE_ENV: "development" });

    expect(getConfigWarnings(env)).toContainEqual(
      expect.stringContaining("AUTH_SECRET"),
    );
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
});
