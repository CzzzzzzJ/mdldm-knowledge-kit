import { describe, expect, it } from "vitest";

import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";

describe("same-origin mutation checks", () => {
  it("uses forwarded host and protocol when present", () => {
    const headers = new Headers({
      "x-forwarded-host": "courses.example.com",
      "x-forwarded-proto": "https",
    });

    expect(getExpectedRequestOrigin(headers, "http:")).toBe(
      "https://courses.example.com",
    );
  });

  it("accepts exact origins and rejects foreign origins", () => {
    expect(
      isSameOriginRequest(
        "https://courses.example.com",
        "https://courses.example.com",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        "https://attacker.example",
        "https://courses.example.com",
      ),
    ).toBe(false);
  });
});
