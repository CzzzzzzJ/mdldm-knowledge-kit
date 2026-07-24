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
      status: ["local", "oss"].includes(runtime.providers.storage)
        ? "configured"
        : "planned",
    },
    email: {
      provider: runtime.providers.email,
      status: ["console", "smtp"].includes(runtime.providers.email)
        ? "configured"
        : "planned",
    },
    payment: {
      provider: runtime.providers.payment,
      status: ["manual", "mock", "xorpay"].includes(
        runtime.providers.payment,
      )
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
