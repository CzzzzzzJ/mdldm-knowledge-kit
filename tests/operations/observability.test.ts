import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  sanitizeLogContext,
  sanitizeOperationalText,
} from "@/modules/operations";
import {
  signObservabilityWebhook,
  WebhookErrorReporter,
} from "@/providers/observability/webhook";

describe("operations observability", () => {
  it("redacts credentials, email addresses and sensitive context keys", () => {
    expect(
      sanitizeOperationalText(
        "Bearer abc.def user@example.com mongodb://admin:password@db.example/test",
      ),
    ).toBe(
      "Bearer [redacted] [redacted-email] mongodb://[redacted]@db.example/test",
    );
    expect(
      sanitizeLogContext({
        userId: "user-1",
        accessToken: "do-not-log",
        count: 2,
      }),
    ).toEqual({
      userId: "user-1",
      accessToken: "[redacted]",
      count: 2,
    });
  });

  it("signs webhook payloads with timestamp-bound HMAC SHA-256", () => {
    const timestamp = "1784880000";
    const body = '{"type":"mdldm.operation_failure"}';
    const secret = "test-webhook-secret";
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    expect(signObservabilityWebhook(timestamp, body, secret)).toBe(
      `sha256=${expected}`,
    );
  });

  it("sends a signed generic webhook without secret data", async () => {
    const calls: Array<{
      url: string | URL | Request;
      request?: RequestInit;
    }> = [];
    const fetcher = vi.fn(
      async (
        url: string | URL | Request,
        request?: RequestInit,
      ): Promise<Response> => {
        calls.push({ url, request });
        return new Response(null, { status: 202 });
      },
    );
    const reporter = new WebhookErrorReporter({
      url: "https://alerts.example.com/mdldm",
      secret: "test-webhook-secret",
      fetcher: fetcher as typeof fetch,
    });

    await reporter.report({
      fingerprint: "a".repeat(64),
      category: "email",
      severity: "error",
      code: "IDENTITY_EMAIL_FAILED",
      message: "身份验证邮件发送失败",
      provider: "smtp",
      sourceType: "user",
      sourceId: "user-1",
      occurredAt: "2026-07-24T00:00:00.000Z",
      occurrenceCount: 1,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [{ url, request }] = calls;
    expect(url).toBe("https://alerts.example.com/mdldm");
    expect(request?.method).toBe("POST");
    expect(request?.headers).toMatchObject({
      "X-MDLDm-Timestamp": expect.any(String),
      "X-MDLDm-Signature": expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
    });
    expect(request?.body).toContain('"type":"mdldm.operation_failure"');
    expect(request?.body).not.toContain("test-webhook-secret");
  });
});
