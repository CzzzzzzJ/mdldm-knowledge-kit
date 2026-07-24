import { createHmac } from "node:crypto";

import type {
  ErrorReport,
  ErrorReporter,
} from "@/providers/observability/port";

export function signObservabilityWebhook(
  timestamp: string,
  body: string,
  secret: string,
): string {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")}`;
}

export class WebhookErrorReporter implements ErrorReporter {
  readonly name = "webhook";

  constructor(
    private readonly options: {
      url: string;
      secret: string;
      fetcher?: typeof fetch;
    },
  ) {}

  async report(event: ErrorReport): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const body = JSON.stringify({
      type: "mdldm.operation_failure",
      version: "1",
      event,
    });
    const response = await (this.options.fetcher ?? fetch)(this.options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "mdldm-knowledge-kit/observability",
        "X-MDLDm-Timestamp": timestamp,
        "X-MDLDm-Signature": signObservabilityWebhook(
          timestamp,
          body,
          this.options.secret,
        ),
      },
      body,
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`告警 Webhook 返回 HTTP ${response.status}`);
    }
  }
}
