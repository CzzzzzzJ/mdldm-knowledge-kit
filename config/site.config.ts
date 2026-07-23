import { getServerEnv } from "@/config/env";
import type { SiteConfig } from "@/modules/site";

export function getSiteConfig(): SiteConfig {
  const env = getServerEnv();

  return {
    name: env.APP_NAME,
    description: "面向个人创作者的自托管知识产品交付与会员运营底座。",
    url: env.APP_URL,
    locale: "zh-CN",
    creator: {
      name: "Demo Creator",
      supportEmail: "support@example.com",
    },
  };
}
