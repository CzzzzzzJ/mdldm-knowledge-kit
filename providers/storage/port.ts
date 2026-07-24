export interface StoredObject {
  objectKey: string;
  size: number;
  checksum: string;
}

export interface StorageObjectInfo {
  size: number;
  checksum?: string;
}

export interface StorageProvider {
  readonly name: "local" | "oss";
  put(
    objectKey: string,
    data: Uint8Array,
    options?: { mimeType?: string },
  ): Promise<StoredObject>;
  localPath(objectKey: string): string | null;
  exists(objectKey: string): Promise<boolean>;
  stat(objectKey: string): Promise<StorageObjectInfo | null>;
  delete(objectKey: string): Promise<void>;
  createReadUrl(
    objectKey: string,
    options: {
      expiresInSeconds: number;
      contentType?: string;
      downloadName?: string;
    },
  ): Promise<string | null>;
  createUploadUrl(
    objectKey: string,
    options: { expiresInSeconds: number; contentType: string },
  ): Promise<string | null>;
}
