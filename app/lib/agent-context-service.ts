import { getSiteInitializationState } from "@/app/lib/site-initialization-service";
import { getPublicRuntimeConfig } from "@/config/env";
import { appVersion } from "@/config/version";
import {
  createAgentContextReport,
  createUnavailableAgentContextReport,
} from "@/modules/site/agent-context";
import { setupLessonSlugs } from "@/modules/site/initialization";
import { getProviderReadiness } from "@/providers/readiness";

export async function getAgentContextReport() {
  const runtime = getPublicRuntimeConfig();
  const lifecycle = await getSiteInitializationState();
  const providers = getProviderReadiness(runtime);

  return createAgentContextReport({
    version: appVersion,
    runtime,
    lifecycle,
    totalSetupLessons: setupLessonSlugs.length,
    providers,
  });
}

export function getUnavailableAgentContextReport() {
  return createUnavailableAgentContextReport({
    version: appVersion,
    totalSetupLessons: setupLessonSlugs.length,
  });
}
