import type { Metadata } from "next";

import { OperatorSetupExperience } from "@/components/operator-setup-experience";
import {
  getConfigWarnings,
  getPublicRuntimeConfig,
  getServerEnv,
} from "@/config/env";
import { getSetupLesson, setupLessons } from "@/modules/site/setup-guide";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "首次开站",
  description:
    "在当前知识站中完成部署、Provider 配置、首课发布和真实学员验收。",
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const params = await searchParams;
  const runtime = getPublicRuntimeConfig();
  const warnings = getConfigWarnings(getServerEnv());

  return (
    <OperatorSetupExperience
      configWarnings={warnings}
      initialLesson={getSetupLesson(params.lesson)}
      lessons={setupLessons}
      runtime={runtime}
    />
  );
}
