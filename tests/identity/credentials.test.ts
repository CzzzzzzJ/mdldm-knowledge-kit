import { describe, expect, it } from "vitest";

import {
  generateTemporaryPassword,
  hashOpaqueToken,
  passwordSchema,
} from "@/modules/identity/credentials";

describe("identity credentials", () => {
  it("requires long passwords containing letters and numbers", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("only-letters-here").success).toBe(false);
    expect(passwordSchema.safeParse("strong-password-2026").success).toBe(true);
  });

  it("hashes opaque tokens without storing the original value", () => {
    const hash = hashOpaqueToken("one-time-token", "test-secret");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("one-time-token");
    expect(hash).toBe(
      hashOpaqueToken("one-time-token", "test-secret"),
    );
  });

  it("generates a unique strong temporary password for each request", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();

    expect(first).toMatch(/^MK1-[A-Za-z0-9_-]{24}$/);
    expect(passwordSchema.safeParse(first).success).toBe(true);
    expect(second).not.toBe(first);
  });
});
