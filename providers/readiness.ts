import type { PublicRuntimeConfig } from "@/config/env";

export type ProviderImplementationStatus = "configured" | "planned";

export interface ProviderReadiness {
  provider: string;
  status: ProviderImplementationStatus;
}

export function getProviderReadiness(
  runtime: PublicRuntimeConfig,
): Record<keyof PublicRuntimeConfig["providers"], ProviderReadiness> {
  return {
    storage: {
      provider: runtime.providers.storage,
      status: runtime.providers.storage === "local" ? "configured" : "planned",
    },
    email: {
      provider: runtime.providers.email,
      status: runtime.providers.email === "console" ? "configured" : "planned",
    },
    payment: {
      provider: runtime.providers.payment,
      status: ["manual", "mock"].includes(runtime.providers.payment)
        ? "configured"
        : "planned",
    },
    transcode: {
      provider: runtime.providers.transcode,
      status: runtime.providers.transcode === "none" ? "configured" : "planned",
    },
    observability: {
      provider: runtime.providers.observability,
      status:
        runtime.providers.observability === "console" ? "configured" : "planned",
    },
  };
}
