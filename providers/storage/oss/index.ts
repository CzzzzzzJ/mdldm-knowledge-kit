import { createHash } from "node:crypto";

import OSS from "ali-oss";

import { getServerEnv } from "@/config/env";
import type {
  StorageProvider,
  StoredObject,
} from "@/providers/storage/port";

function createClient(): OSS {
  const env = getServerEnv();
  if (
    !env.OSS_REGION ||
    !env.OSS_BUCKET ||
    !env.OSS_ACCESS_KEY_ID ||
    !env.OSS_ACCESS_KEY_SECRET
  ) {
    throw new Error("OSS 配置不完整");
  }

  return new OSS({
    region: env.OSS_REGION,
    bucket: env.OSS_BUCKET,
    endpoint: env.OSS_ENDPOINT,
    accessKeyId: env.OSS_ACCESS_KEY_ID,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
    stsToken: env.OSS_SESSION_TOKEN,
    secure: true,
    authorizationV4: true,
  });
}

function responseHeaders(headers: object): Record<string, string | undefined> {
  return headers as Record<string, string | undefined>;
}

export const ossStorageProvider: StorageProvider = {
  name: "oss",

  async put(objectKey, data, options) {
    const client = createClient();
    await client.put(objectKey, Buffer.from(data), {
      mime: options?.mimeType,
    });
    return {
      objectKey,
      size: data.byteLength,
      checksum: createHash("sha256").update(data).digest("hex"),
    } satisfies StoredObject;
  },

  localPath() {
    return null;
  },

  async exists(objectKey) {
    return (await this.stat(objectKey)) !== null;
  },

  async stat(objectKey) {
    try {
      const result = await createClient().head(objectKey);
      const headers = responseHeaders(result.res.headers);
      const size = Number(headers["content-length"]);
      const etag = headers.etag?.replaceAll('"', "");
      return Number.isFinite(size)
        ? { size, checksum: etag ? `etag:${etag}` : undefined }
        : null;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  async delete(objectKey) {
    await createClient().delete(objectKey);
  },

  async createReadUrl(objectKey, options) {
    const response: Record<string, string> = {};
    if (options.contentType) {
      response["content-type"] = options.contentType;
    }
    if (options.downloadName) {
      response["content-disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(options.downloadName)}`;
    }

    return createClient().signatureUrl(objectKey, {
      method: "GET",
      expires: options.expiresInSeconds,
      response,
    });
  },

  async createUploadUrl(objectKey, options) {
    return createClient().signatureUrl(objectKey, {
      method: "PUT",
      expires: options.expiresInSeconds,
      "Content-Type": options.contentType,
    });
  },
};
