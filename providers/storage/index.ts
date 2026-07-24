import { getServerEnv } from "@/config/env";
import { localStorageProvider } from "@/providers/storage/local";
import { ossStorageProvider } from "@/providers/storage/oss";
import type { StorageProvider } from "@/providers/storage/port";

export function getStorageProvider(): StorageProvider {
  const provider = getServerEnv().STORAGE_PROVIDER;
  if (provider === "local") {
    return localStorageProvider;
  }
  if (provider === "oss") {
    return ossStorageProvider;
  }
  throw new Error("S3 Storage Provider 尚未实现");
}
