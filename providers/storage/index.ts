import { getServerEnv } from "@/config/env";
import { localStorageProvider } from "@/providers/storage/local";
import type { StorageProvider } from "@/providers/storage/port";

const lazyOssStorageProvider: StorageProvider = {
  name: "oss",

  async put(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.put(...args);
  },

  localPath() {
    return null;
  },

  async exists(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.exists(...args);
  },

  async stat(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.stat(...args);
  },

  async delete(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.delete(...args);
  },

  async createReadUrl(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.createReadUrl(...args);
  },

  async createUploadUrl(...args) {
    const { ossStorageProvider } = await import("@/providers/storage/oss");
    return ossStorageProvider.createUploadUrl(...args);
  },
};

export function getStorageProvider(): StorageProvider {
  const provider = getServerEnv().STORAGE_PROVIDER;
  if (provider === "local") {
    return localStorageProvider;
  }
  if (provider === "oss") {
    return lazyOssStorageProvider;
  }

  return provider satisfies never;
}
