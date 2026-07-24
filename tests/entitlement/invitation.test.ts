import { describe, expect, it } from "vitest";

import {
  hashInvitationCode,
  invitationCodeHint,
  normalizeInvitationCode,
} from "@/modules/entitlement/invitation";

describe("invitation codes", () => {
  it("normalizes codes before hashing", () => {
    expect(normalizeInvitationCode(" mdldm-demo ")).toBe("MDLDM-DEMO");
    expect(hashInvitationCode("mdldm-demo", "secret")).toBe(
      hashInvitationCode(" MDLDM-DEMO ", "secret"),
    );
  });

  it("only exposes a short hint", () => {
    expect(invitationCodeHint("MDLDM-ABCDEFGHIJKL")).toBe(
      "MDLDM-AB…IJKL",
    );
  });
});
