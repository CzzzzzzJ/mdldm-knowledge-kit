import type { HealthCheck } from "@/modules/operations";

export interface DatabaseProvider {
  connect(): Promise<void>;
  health(): Promise<HealthCheck>;
}
