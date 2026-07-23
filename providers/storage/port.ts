export interface StoredObject {
  objectKey: string;
  absolutePath: string;
  size: number;
  checksum: string;
}

export interface StorageProvider {
  put(objectKey: string, data: Uint8Array): Promise<StoredObject>;
  resolve(objectKey: string): string;
  exists(objectKey: string): Promise<boolean>;
  delete(objectKey: string): Promise<void>;
}
