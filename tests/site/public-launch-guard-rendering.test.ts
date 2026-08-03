import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function collectPageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectPageFiles(target);
      }
      return entry.isFile() && entry.name === "page.tsx" ? [target] : [];
    }),
  );
  return nested.flat();
}

describe("public site launch guard rendering contract", () => {
  it("keeps every database-backed guarded page dynamic", async () => {
    const pages = await collectPageFiles(path.join(process.cwd(), "app"));
    const guardedPages = (
      await Promise.all(
        pages.map(async (file) => ({
          file,
          source: await readFile(file, "utf8"),
        })),
      )
    ).filter(({ source }) => source.includes("requirePublicSiteAccess"));

    expect(guardedPages.length).toBeGreaterThan(0);
    for (const { file, source } of guardedPages) {
      expect(
        source,
        `${path.relative(process.cwd(), file)} must not query MongoDB during next build`,
      ).toContain('export const dynamic = "force-dynamic";');
    }
  });
});
