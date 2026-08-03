import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { AdminLaunchReadiness } from "@/components/admin-launch-readiness";
import { OperatorSetupExperience } from "@/components/operator-setup-experience";
import {
  ensureSiteInitializationForAdmin,
  getSetupReadiness,
} from "@/app/lib/site-initialization-service";
import {
  getConfigWarnings,
  getPublicRuntimeConfig,
  getServerEnv,
} from "@/config/env";
import { getSetupLesson, setupLessons } from "@/modules/site/setup-guide";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireAdminPage("/admin/setup");
  const params = await searchParams;
  const state = await ensureSiteInitializationForAdmin(user.id);
  const readiness = await getSetupReadiness();
  const runtime = getPublicRuntimeConfig();
  const warnings = getConfigWarnings(getServerEnv());

  return (
    <AdminShell
      active="setup"
      currentUserEmail={user.email}
      description="从系统连接到首课发布，按真实状态完成配置。所有任务都保存在当前知识站中。"
      title={state.status === "live" ? "开站指南" : "完成首次开站"}
    >
      <OperatorSetupExperience
        configWarnings={warnings}
        embedded
        initialCompleted={state.completedLessons}
        initialLesson={getSetupLesson(params.lesson)}
        lessons={setupLessons}
        runtime={runtime}
      />
      <AdminLaunchReadiness
        isLive={state.status === "live"}
        readiness={readiness}
      />
    </AdminShell>
  );
}
