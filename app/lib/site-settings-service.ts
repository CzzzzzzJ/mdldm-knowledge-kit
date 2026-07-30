import { getSiteConfig } from "@/config/site.config";
import {
  getDefaultSiteSettings,
  siteSettingsInputSchema,
  type ResolvedSiteSettings,
  type SiteSettingsInput,
  type SiteSettingsPatch,
} from "@/modules/site/settings";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  SiteSettingModel,
  type SiteSettingRecord,
} from "@/providers/database/mongodb/models/site-setting";

const singletonKey = "default";

function toInput(record: SiteSettingRecord): SiteSettingsInput {
  return {
    siteName: record.siteName,
    description: record.description,
    creatorName: record.creatorName,
    creatorBio: record.creatorBio,
    supportEmail: record.supportEmail,
    homeTitle: record.homeTitle,
    homeSubtitle: record.homeSubtitle,
    avatarUrl: record.avatarUrl,
    heroImageUrl: record.heroImageUrl,
    socialLinks: record.socialLinks.map((link) => ({
      label: link.label,
      url: link.url,
    })),
  };
}
export async function getResolvedSiteSettings(): Promise<ResolvedSiteSettings> {
  const site = getSiteConfig();
  const fallback = getDefaultSiteSettings(site);

  try {
    await connectMongo();
    const record = await SiteSettingModel.findOne({ singletonKey }).lean();
    if (!record) {
      return fallback;
    }

    const parsed = siteSettingsInputSchema.safeParse(toInput(record));
    if (!parsed.success) {
      return fallback;
    }

    return {
      ...parsed.data,
      url: site.url,
      locale: site.locale,
      source: "database",
    };
  } catch {
    return fallback;
  }
}

export async function updateSiteSettings(
  patch: SiteSettingsPatch,
): Promise<ResolvedSiteSettings> {
  const current = await getResolvedSiteSettings();
  const input = siteSettingsInputSchema.parse({
    siteName: current.siteName,
    description: current.description,
    creatorName: current.creatorName,
    creatorBio: current.creatorBio,
    supportEmail: current.supportEmail,
    homeTitle: current.homeTitle,
    homeSubtitle: current.homeSubtitle,
    avatarUrl: current.avatarUrl,
    heroImageUrl: current.heroImageUrl,
    socialLinks: current.socialLinks,
    ...patch,
  });

  await connectMongo();
  const record = await SiteSettingModel.findOneAndUpdate(
    { singletonKey },
    {
      $set: input,
      $setOnInsert: { singletonKey },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).lean();

  if (!record) {
    throw new Error("SITE_SETTINGS_UPDATE_FAILED");
  }

  const site = getSiteConfig();
  return {
    ...siteSettingsInputSchema.parse(toInput(record)),
    url: site.url,
    locale: site.locale,
    source: "database",
  };
}
