import { describe, expect, it } from "vitest";

import { localStorageProvider } from "@/providers/storage/local";

describe("local storage provider", () => {
  it("keeps object keys inside the configured storage root", () => {
    expect(localStorageProvider.localPath("video/demo.mp4")).toContain(
      "uploads/video/demo.mp4",
    );
    expect(() => localStorageProvider.localPath("../private.env")).toThrow(
      /非法媒体对象路径/,
    );
  });
});
