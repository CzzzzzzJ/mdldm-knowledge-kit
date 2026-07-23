export const mediaKinds = ["image", "video", "document"] as const;
export type MediaKind = (typeof mediaKinds)[number];

export const mediaStatuses = [
  "pending",
  "ready",
  "failed",
  "deleted",
] as const;
export type MediaStatus = (typeof mediaStatuses)[number];

export interface MediaAssetDescriptor {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
  provider: string;
  objectKey: string;
}
