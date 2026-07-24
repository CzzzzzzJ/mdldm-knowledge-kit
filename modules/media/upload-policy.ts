import { z } from "zod";

import { mediaKinds, type MediaKind } from "@/modules/media";

export const mediaKindSchema = z.enum(mediaKinds);

const allowedMimeTypes: Record<MediaKind, ReadonlySet<string>> = {
  video: new Set(["video/mp4"]),
  document: new Set([
    "application/pdf",
    "application/zip",
    "text/plain",
    "text/markdown",
  ]),
  image: new Set(["image/jpeg", "image/png", "image/webp"]),
};

export function isAllowedMediaUpload(input: {
  kind: MediaKind;
  mimeType: string;
  size: number;
  maxBytes: number;
}): boolean {
  return (
    input.size > 0 &&
    input.size <= input.maxBytes &&
    allowedMimeTypes[input.kind].has(input.mimeType)
  );
}
