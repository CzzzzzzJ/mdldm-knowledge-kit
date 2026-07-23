import { createHash } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/config/env";
import type {
  StorageProvider,
  StoredObject,
} from "@/providers/storage/port";

function storageRoot(): string {
  return path.resolve(process.cwd(), getServerEnv().LOCAL_STORAGE_PATH);
}

function resolveObjectKey(objectKey: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, objectKey);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("非法媒体对象路径");
  }

  return resolved;
}

export const localStorageProvider: StorageProvider = {
  async put(objectKey, data) {
    const absolutePath = resolveObjectKey(objectKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data, { flag: "wx" });

    return {
      objectKey,
      absolutePath,
      size: data.byteLength,
      checksum: createHash("sha256").update(data).digest("hex"),
    } satisfies StoredObject;
  },

  resolve(objectKey) {
    return resolveObjectKey(objectKey);
  },

  async exists(objectKey) {
    try {
      await access(resolveObjectKey(objectKey));
      return true;
    } catch {
      return false;
    }
  },

  async delete(objectKey) {
    await unlink(resolveObjectKey(objectKey)).catch((error: unknown) => {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    });
  },
};
