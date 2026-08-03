import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectFiles(target);
        return entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)
          ? [target]
          : [];
      }),
    )
  ).flat();
}

describe("application boundaries", () => {
  it("keeps pages, route handlers and components away from MongoDB models", async () => {
    const roots = ["app", "components"].map((directory) =>
      path.join(process.cwd(), directory),
    );
    const files = (await Promise.all(roots.map(collectFiles))).flat();
    const entryFiles = files.filter((file) =>
      /(?:page|route)\.tsx?$/u.test(file) || file.includes(`${path.sep}components${path.sep}`),
    );

    for (const file of entryFiles) {
      const source = await readFile(file, "utf8");
      expect(
        source,
        `${path.relative(process.cwd(), file)} must use an application/query service`,
      ).not.toContain("providers/database/mongodb/models");
    }
  });

  it("does not let domain modules import provider adapters", async () => {
    const files = await collectFiles(path.join(process.cwd(), "modules"));
    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(
        source,
        `${path.relative(process.cwd(), file)} must remain provider independent`,
      ).not.toMatch(/from\s+["']@\/providers\//u);
    }
  });

  it("keeps Mongoose and database adapters out of client entry files", async () => {
    const files = (
      await Promise.all(
        ["app", "components"].map((directory) =>
          collectFiles(path.join(process.cwd(), directory)),
        ),
      )
    ).flat();
    const clientFiles = [] as string[];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (/^["']use client["'];/u.test(source)) clientFiles.push(file);
    }

    for (const file of clientFiles) {
      const source = await readFile(file, "utf8");
      expect(source, path.relative(process.cwd(), file)).not.toMatch(
        /(?:from\s+["']mongoose["']|@\/providers\/database\/mongodb)/u,
      );
    }
  });
});
