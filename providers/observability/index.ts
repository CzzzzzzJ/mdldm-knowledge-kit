import { getServerEnv } from "@/config/env";
import { consoleErrorReporter } from "@/providers/observability/console";
import type { ErrorReporter } from "@/providers/observability/port";
import { WebhookErrorReporter } from "@/providers/observability/webhook";

export function getErrorReporter(): ErrorReporter {
  const env = getServerEnv();
  if (env.OBSERVABILITY_PROVIDER !== "webhook") {
    return consoleErrorReporter;
  }
  if (!env.OBSERVABILITY_WEBHOOK_URL || !env.OBSERVABILITY_WEBHOOK_SECRET) {
    throw new Error("Webhook Observability Provider 配置不完整");
  }
  return new WebhookErrorReporter({
    url: env.OBSERVABILITY_WEBHOOK_URL,
    secret: env.OBSERVABILITY_WEBHOOK_SECRET,
  });
}
