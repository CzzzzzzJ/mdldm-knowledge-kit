import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  createSession: vi.fn(),
  consumeRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  getServerEnv: () => ({
    NODE_ENV: "development",
    APP_URL: "http://knowledge.test",
  }),
}));

vi.mock("@/app/lib/identity-service", () => ({
  authenticateUser: mocks.authenticateUser,
}));

vi.mock("@/providers/auth/session", () => ({
  createSession: mocks.createSession,
}));

vi.mock("@/providers/rate-limit/mongodb", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  clearRateLimit: mocks.clearRateLimit,
}));

import { POST } from "@/app/api/auth/login/route";

function loginRequest(
  body: unknown,
  origin = "http://knowledge.test",
): NextRequest {
  return new NextRequest("http://knowledge.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "knowledge.test",
      origin,
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("rejects cross-origin mutations before authentication", async () => {
    const response = await POST(
      loginRequest(
        { email: "learner@example.com", password: "valid-password" },
        "https://attacker.example",
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "请求来源无效" });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it("returns a retry window when the shared rate limit is exhausted", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 37,
    });

    const response = await POST(
      loginRequest({
        email: "learner@example.com",
        password: "valid-password",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it("uses a strict body schema and never accepts role injection", async () => {
    const response = await POST(
      loginRequest({
        email: "learner@example.com",
        password: "valid-password",
        role: "admin",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it("maps invalid and unverified identities to stable status codes", async () => {
    mocks.authenticateUser.mockResolvedValueOnce({
      ok: false,
      reason: "invalid",
    });
    const invalid = await POST(
      loginRequest({
        email: "learner@example.com",
        password: "wrong-password",
      }),
    );
    expect(invalid.status).toBe(401);

    mocks.authenticateUser.mockResolvedValueOnce({
      ok: false,
      reason: "email_not_verified",
    });
    const unverified = await POST(
      loginRequest({
        email: "learner@example.com",
        password: "valid-password",
      }),
    );
    expect(unverified.status).toBe(403);
    await expect(unverified.json()).resolves.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates a session and clears the rate bucket after a valid login", async () => {
    const user = {
      _id: { toString: () => "66aa11bb22cc33dd44ee5501" },
      name: "虚构学员",
      email: "learner@example.com",
      role: "user",
      requiresPasswordChange: false,
    };
    mocks.authenticateUser.mockResolvedValue({ ok: true, user });

    const response = await POST(
      loginRequest({
        email: "learner@example.com",
        password: "valid-password",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith(user);
    expect(mocks.clearRateLimit).toHaveBeenCalledWith(
      "login:203.0.113.10",
    );
    await expect(response.json()).resolves.toMatchObject({
      user: {
        id: "66aa11bb22cc33dd44ee5501",
        email: "learner@example.com",
        role: "user",
      },
    });
  });
});
