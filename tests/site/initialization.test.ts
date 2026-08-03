import { describe, expect, it } from "vitest";

import {
  initialAdminActivationInputSchema,
  initialAdminInputSchema,
  setupLessonSlugs,
  setupProgressInputSchema,
} from "@/modules/site/initialization";
import { SiteInitializationModel } from "@/providers/database/mongodb/models/site-initialization";
import { UserModel } from "@/providers/database/mongodb/models/user";

describe("site initialization", () => {
  it("accepts two matching administrator emails and normalizes both", () => {
    const parsed = initialAdminInputSchema.parse({
      email: " ADMIN@EXAMPLE.COM ",
      emailConfirmation: "admin@example.com",
    });

    expect(parsed.email).toBe("admin@example.com");
    expect(parsed.emailConfirmation).toBe("admin@example.com");
  });

  it("rejects mismatched emails and unknown fields", () => {
    expect(
      initialAdminInputSchema.safeParse({
        email: "admin@example.com",
        emailConfirmation: "other@example.com",
      }).success,
    ).toBe(false);

    expect(
      initialAdminInputSchema.safeParse({
        email: "admin@example.com",
        emailConfirmation: "admin@example.com",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("requires a strong confirmed permanent password for activation", () => {
    expect(
      initialAdminActivationInputSchema.safeParse({
        password: "strong-password-2026",
        passwordConfirmation: "strong-password-2026",
      }).success,
    ).toBe(true);
    expect(
      initialAdminActivationInputSchema.safeParse({
        password: "strong-password-2026",
        passwordConfirmation: "different-password-2026",
      }).success,
    ).toBe(false);
  });

  it("only accepts progress updates for known setup lessons", () => {
    expect(
      setupProgressInputSchema.parse({
        lesson: setupLessonSlugs[0],
        completed: true,
      }),
    ).toEqual({ lesson: "welcome", completed: true });
    expect(
      setupProgressInputSchema.safeParse({
        lesson: "unknown",
        completed: true,
      }).success,
    ).toBe(false);
  });

  it("keeps the persistence model strict", () => {
    expect(
      () =>
        new SiteInitializationModel({
          singletonKey: "default",
          status: "configuring",
          completedLessons: [],
          unexpectedSecret: "must-not-persist",
        }),
    ).toThrow(/strict mode|not in schema/i);

    expect(
      () =>
        new UserModel({
          name: "管理员 1 号",
          email: "admin@example.com",
          passwordHash: "bcrypt-hash-placeholder",
          role: "admin",
          status: "active",
          emailVerified: true,
          requiresPasswordChange: true,
          temporaryPassword: "must-not-persist",
        }),
    ).toThrow(/strict mode|not in schema/i);
  });
});
