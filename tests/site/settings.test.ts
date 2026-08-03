import { describe, expect, it } from "vitest";

import type { SiteConfig } from "@/modules/site";
import {
  getDefaultSiteSettings,
  siteSettingsInputSchema,
  siteSettingsPatchSchema,
} from "@/modules/site/settings";
import { resolveSiteTheme } from "@/modules/site/themes";
import { SiteSettingModel } from "@/providers/database/mongodb/models/site-setting";

const validSettings = {
  theme: "mdldm" as const,
  siteName: "创作者知识站",
  description: "把公开内容整理成可持续学习的课程。",
  creatorName: "Demo Creator",
  creatorBio: "分享内容创作与 AI 工作流。",
  supportEmail: "support@example.com",
  homeTitle: "把经验变成能学会的课程",
  homeSubtitle: "从免费内容开始，按自己的节奏学习。",
  avatarUrl: "https://images.example.com/avatar.png",
  heroImageUrl: null,
  socialLinks: [
    {
      label: "Bilibili",
      url: "https://space.bilibili.com/123",
    },
  ],
};

describe("site settings", () => {
  it("accepts and trims a complete public site configuration", () => {
    const parsed = siteSettingsInputSchema.parse({
      ...validSettings,
      siteName: "  创作者知识站  ",
      avatarUrl: "",
    });

    expect(parsed.siteName).toBe("创作者知识站");
    expect(parsed.theme).toBe("mdldm");
    expect(parsed.avatarUrl).toBeNull();
    expect(parsed.socialLinks).toHaveLength(1);
  });

  it("rejects unknown fields and non-http public links", () => {
    expect(
      siteSettingsInputSchema.safeParse({
        ...validSettings,
        SMTP_PASSWORD: "never-store-secrets-here",
      }).success,
    ).toBe(false);
    expect(
      siteSettingsInputSchema.safeParse({
        ...validSettings,
        heroImageUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("keeps the persistence schema strict", () => {
    expect(
      () =>
        new SiteSettingModel({
          ...validSettings,
          singletonKey: "default",
          unknownSetting: "must-not-be-persisted",
        }),
    ).toThrow(/strict mode|not in schema/i);
  });

  it("accepts a non-empty partial update and rejects empty patches", () => {
    expect(
      siteSettingsPatchSchema.parse({ homeTitle: "新的首页标题" }),
    ).toEqual({ homeTitle: "新的首页标题" });
    expect(siteSettingsPatchSchema.safeParse({}).success).toBe(false);
    expect(siteSettingsPatchSchema.parse({ theme: "minimal" })).toEqual({
      theme: "minimal",
    });
    expect(siteSettingsPatchSchema.safeParse({ theme: "custom-css" }).success).toBe(
      false,
    );
  });

  it("falls back old or unknown records to the mdldm theme", () => {
    expect(resolveSiteTheme(undefined)).toBe("mdldm");
    expect(resolveSiteTheme("legacy-theme")).toBe("mdldm");
    expect(resolveSiteTheme("minimal")).toBe("minimal");
  });

  it("limits public social links to eight entries", () => {
    const socialLinks = Array.from({ length: 9 }, (_, index) => ({
      label: `平台 ${index + 1}`,
      url: `https://example.com/${index + 1}`,
    }));

    expect(
      siteSettingsInputSchema.safeParse({
        ...validSettings,
        socialLinks,
      }).success,
    ).toBe(false);
  });

  it("builds a safe fallback from the existing site config", () => {
    const site: SiteConfig = {
      name: "Existing Site",
      description: "Existing description",
      url: "https://example.com",
      locale: "zh-CN",
      creator: {
        name: "Existing Creator",
        supportEmail: "creator@example.com",
      },
    };

    expect(getDefaultSiteSettings(site)).toMatchObject({
      siteName: "Existing Site",
      description: "Existing description",
      creatorName: "Existing Creator",
      supportEmail: "creator@example.com",
      homeTitle: "把 AI 学会，也把它做成作品",
      theme: "mdldm",
      source: "config",
    });
  });
});
