import { z } from "zod";

import type { SiteConfig } from "@/modules/site";

const httpUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "必须使用 http 或 https URL");

const optionalHttpUrlSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  httpUrlSchema.nullable(),
);

export const socialLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    url: httpUrlSchema,
  })
  .strict();

export const siteSettingsInputSchema = z
  .object({
    siteName: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(500),
    creatorName: z.string().trim().min(1).max(80),
    creatorBio: z.string().trim().max(1_000),
    supportEmail: z.string().trim().email().max(254),
    homeTitle: z.string().trim().min(1).max(120),
    homeSubtitle: z.string().trim().min(1).max(500),
    avatarUrl: optionalHttpUrlSchema,
    heroImageUrl: optionalHttpUrlSchema,
    socialLinks: z.array(socialLinkSchema).max(8),
  })
  .strict();

export const siteSettingsPatchSchema = siteSettingsInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少需要更新一个站点设置",
  });

export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;

export interface ResolvedSiteSettings extends SiteSettingsInput {
  url: string;
  locale: string;
  source: "database" | "config";
}

export function getDefaultSiteSettings(site: SiteConfig): ResolvedSiteSettings {
  return {
    siteName: site.name,
    description: site.description,
    creatorName: site.creator.name,
    creatorBio: "分享 AI 内容创作、工作流和独立产品实践。所有示例内容均为虚构数据。",
    supportEmail: site.creator.supportEmail,
    homeTitle: "把 AI 学会，也把它做成作品",
    homeSubtitle: "围绕真实项目拆解工具、方法与完整工作流。",
    avatarUrl: null,
    heroImageUrl: null,
    socialLinks: [],
    url: site.url,
    locale: site.locale,
    source: "config",
  };
}
