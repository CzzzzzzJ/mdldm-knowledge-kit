export const siteThemeIds = ["mdldm", "minimal"] as const;
export type SiteThemeId = (typeof siteThemeIds)[number];

export const siteThemeOptions: ReadonlyArray<{
  id: SiteThemeId;
  label: string;
  description: string;
}> = [
  {
    id: "mdldm",
    label: "麦当 mdldm",
    description: "黄色强调、粗描边与硬阴影，保留麦当知识站的 Neo-brutalism 识别度。",
  },
  {
    id: "minimal",
    label: "极简知识库",
    description: "冷静中性色、细边框与轻层级，让图文和课程内容成为视觉中心。",
  },
];

export function resolveSiteTheme(value: unknown): SiteThemeId {
  return siteThemeIds.includes(value as SiteThemeId)
    ? (value as SiteThemeId)
    : "mdldm";
}
