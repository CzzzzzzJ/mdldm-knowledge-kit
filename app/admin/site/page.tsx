import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { AdminSiteSettingsForm } from "@/components/admin-site-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSiteSettingsPage() {
  const [user, settings] = await Promise.all([
    requireAdminPage("/admin/site"),
    getResolvedSiteSettings(),
  ]);

  return (
    <AdminShell
      active="site"
      currentUserEmail={user.email}
      description="不修改代码即可更新品牌、首页文案、创作者资料和公开社交链接。第三方平台密钥仍只保存在部署平台的环境变量中。"
      title="站点设置"
    >
      <AdminSiteSettingsForm initialSettings={settings} />
    </AdminShell>
  );
}
