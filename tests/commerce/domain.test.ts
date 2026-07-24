import { describe, expect, it } from "vitest";

import {
  calculateEntitlementWindow,
  formatMinorUnits,
  parseCnyAmountToMinorUnits,
} from "@/modules/commerce";

describe("commerce domain", () => {
  it("formats and parses CNY without trusting floating point amounts", () => {
    expect(formatMinorUnits(49_900, "CNY")).toBe("499.00");
    expect(parseCnyAmountToMinorUnits("499.00")).toBe(49_900);
    expect(parseCnyAmountToMinorUnits("0.01")).toBe(1);
    expect(parseCnyAmountToMinorUnits("499.001")).toBeNull();
    expect(parseCnyAmountToMinorUnits("-1.00")).toBeNull();
  });

  it("extends a duration entitlement from the active expiration", () => {
    const now = new Date("2026-07-24T00:00:00.000Z");
    const currentEnd = new Date("2026-08-01T00:00:00.000Z");
    const window = calculateEntitlementWindow({
      now,
      durationDays: 30,
      existingEndsAt: currentEnd,
    });

    expect(window.startsAt).toEqual(now);
    expect(window.endsAt).toEqual(
      new Date("2026-08-31T00:00:00.000Z"),
    );
  });

  it("supports permanent single-course access", () => {
    const now = new Date("2026-07-24T00:00:00.000Z");
    expect(
      calculateEntitlementWindow({ now, durationDays: null }),
    ).toEqual({ startsAt: now, endsAt: null });
  });
});
