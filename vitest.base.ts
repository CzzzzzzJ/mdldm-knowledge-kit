import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function defineTestLayer(include: string[]) {
  return defineConfig({
    resolve: {
      alias: {
        "@": dirname,
      },
    },
    test: {
      environment: "node",
      include,
    },
  });
}
