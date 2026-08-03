import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function collectTests(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectTests(target);
        return entry.isFile() && entry.name.endsWith(".test.ts")
          ? [path.relative(process.cwd(), target).split(path.sep).join("/")]
          : [];
      }),
    )
  ).flat();
}

describe("test layer registration", () => {
  it("assigns every Vitest file to exactly one of L1, L2 or L3", async () => {
    const configs = await Promise.all(
      ["vitest.l1.config.ts", "vitest.l2.config.ts", "vitest.l3.config.ts"].map(
        (file) => readFile(path.join(process.cwd(), file), "utf8"),
      ),
    );
    const registrations = configs.flatMap(
      (source) =>
        source.match(/tests\/[a-z0-9_/-]+\.test\.ts/giu) ?? [],
    );
    const counts = new Map<string, number>();
    for (const registration of registrations) {
      counts.set(registration, (counts.get(registration) ?? 0) + 1);
    }

    const tests = (await collectTests(path.join(process.cwd(), "tests"))).sort();
    expect(tests.filter((file) => !counts.has(file))).toEqual([]);
    expect(
      Array.from(counts.entries()).filter(([, count]) => count !== 1),
    ).toEqual([]);
    expect(Array.from(counts.keys()).sort()).toEqual(tests);
  });
});
