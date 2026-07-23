export type HealthStatus = "ok" | "degraded" | "error" | "not_checked";

export interface HealthCheck {
  status: HealthStatus;
  checkedAt: string;
  message?: string;
}
