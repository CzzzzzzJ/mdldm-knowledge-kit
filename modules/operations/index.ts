export type HealthStatus = "ok" | "degraded" | "error" | "not_checked";

export interface HealthCheck {
  status: HealthStatus;
  checkedAt: string;
  message?: string;
}

export const operationFailureCategories = [
  "payment",
  "transcode",
  "email",
  "storage",
] as const;
export type OperationFailureCategory =
  (typeof operationFailureCategories)[number];

export const operationFailureStatuses = [
  "open",
  "resolved",
  "ignored",
] as const;
export type OperationFailureStatus =
  (typeof operationFailureStatuses)[number];

export const operationFailureSeverities = [
  "warning",
  "error",
  "critical",
] as const;
export type OperationFailureSeverity =
  (typeof operationFailureSeverities)[number];

export interface OperationalFailureInput {
  category: OperationFailureCategory;
  severity: OperationFailureSeverity;
  code: string;
  summary: string;
  error?: unknown;
  provider?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

const sensitiveKeyPattern =
  /authorization|cookie|password|secret|token|access[_-]?key|session/i;
const emailPattern =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const bearerPattern = /bearer\s+[a-z0-9._~+/-]+=*/gi;
const credentialUrlPattern = /(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi;

export function sanitizeOperationalText(
  value: unknown,
  maxLength = 1_000,
): string {
  const text =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "未知错误";

  return text
    .replace(credentialUrlPattern, "$1[redacted]@")
    .replace(emailPattern, "[redacted-email]")
    .replace(bearerPattern, "Bearer [redacted]")
    .slice(0, maxLength);
}

export function sanitizeLogContext(
  context: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => {
      if (sensitiveKeyPattern.test(key)) {
        return [key, "[redacted]"];
      }
      if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        return [key, value];
      }
      return [key, sanitizeOperationalText(value, 500)];
    }),
  );
}
