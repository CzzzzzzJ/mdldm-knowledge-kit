import { describe, expect, it } from "vitest";

import { getConfigWarnings, parseEnv } from "@/config/env";

describe("environment configuration", () => {
  it("provides safe local defaults", () => {
    const env = parseEnv({ NODE_ENV: "development" });

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
      AUTH_SECRET: "a-secure-production-value-with-more-than-32-characters",
    });

    expect(env.NODE_ENV).toBe("production");
  });
});
