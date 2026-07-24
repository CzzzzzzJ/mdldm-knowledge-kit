import { describe, expect, it } from "vitest";

import { isAllowedMediaUpload } from "@/modules/media/upload-policy";

describe("media upload policy", () => {
  it("accepts valid MP4 files within the server limit", () => {
    expect(
      isAllowedMediaUpload({
        kind: "video",
        mimeType: "video/mp4",
        size: 10,
        maxBytes: 20,
      }),
    ).toBe(true);
  });

  it("rejects mismatched MIME types and oversized files", () => {
    expect(
      isAllowedMediaUpload({
        kind: "video",
        mimeType: "text/html",
        size: 10,
        maxBytes: 20,
      }),
    ).toBe(false);
    expect(
      isAllowedMediaUpload({
        kind: "document",
        mimeType: "application/pdf",
        size: 21,
        maxBytes: 20,
      }),
    ).toBe(false);
  });
});
