import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveSiteTheme,
  siteThemeIds,
  siteThemeOptions,
} from "@/modules/site/themes";

async function readProjectFile(file: string) {
  return readFile(path.join(process.cwd(), file), "utf8");
}

describe("site theme system", () => {
  it("keeps exactly two reviewed themes with a safe default", () => {
    expect(siteThemeIds).toEqual(["mdldm", "minimal"]);
    expect(siteThemeOptions.map((option) => option.id)).toEqual(siteThemeIds);
    expect(resolveSiteTheme(undefined)).toBe("mdldm");
    expect(resolveSiteTheme("remote-theme")).toBe("mdldm");
  });

  it("applies the persisted theme at the document root", async () => {
    const layout = await readProjectFile("app/layout.tsx");

    expect(layout).toContain("const site = await getResolvedSiteSettings()");
    expect(layout).toContain("data-theme={site.theme}");
    expect(layout).not.toContain("dangerouslySetInnerHTML");
  });

  it("defines visual differences through shared semantic tokens", async () => {
    const css = await readProjectFile("app/globals.css");

    expect(css).toContain(':root[data-theme="minimal"]');
    for (const token of [
      "--page",
      "--surface",
      "--ink",
      "--accent",
      "--frame-border-width",
      "--frame-shadow",
      "--control-border-width",
      "--control-radius",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("exposes theme selection in site settings without custom CSS input", async () => {
    const form = await readProjectFile("components/admin-site-settings-form.tsx");

    expect(form).toContain("siteThemeOptions.map");
    expect(form).toContain("document.documentElement.dataset.theme = savedTheme");
    expect(form).toContain("主题只改变颜色、边框、圆角和层级");
    expect(form).not.toMatch(/name=["']customCss["']/);
    expect(form).not.toContain("dangerouslySetInnerHTML");
  });
});
