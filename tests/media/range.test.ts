import { describe, expect, it } from "vitest";

import { parseByteRange } from "@/modules/media/range";

describe("HTTP byte ranges", () => {
  it("parses bounded and open ranges", () => {
    expect(parseByteRange("bytes=0-99", 1_000)).toEqual({
      start: 0,
      end: 99,
    });
    expect(parseByteRange("bytes=900-", 1_000)).toEqual({
      start: 900,
      end: 999,
    });
  });

  it("parses suffix ranges", () => {
    expect(parseByteRange("bytes=-100", 1_000)).toEqual({
      start: 900,
      end: 999,
    });
  });

  it("rejects malformed and out-of-bounds ranges", () => {
    expect(parseByteRange("bytes=1000-", 1_000)).toBeNull();
    expect(parseByteRange("bytes=100-20", 1_000)).toBeNull();
    expect(parseByteRange("bytes=0-10,20-30", 1_000)).toBeNull();
  });
});
