import { describe, expect, it } from "vitest";
import { decodePeerAccessibilityMorse, encodePeerAccessibilityMorse, spellPeerAccessibilityCode } from "../src/index.js";

describe("peer accessibility code fallbacks", () => {
  it("round-trips grouped manual and ntfy lookup codes through Morse", () => {
    for (const code of ["ABCDE-23456-ZYXWV", "TPN2-ABCDE-23456"]) {
      expect(decodePeerAccessibilityMorse(encodePeerAccessibilityMorse(code))).toBe(code);
    }
  });

  it("spells ambiguous symbols explicitly for trusted-host speech synthesis", () => {
    expect(spellPeerAccessibilityCode("A0-Z:2")).toBe("alpha zero dash zulu colon two");
  });

  it("rejects unsupported and oversized input", () => {
    expect(() => encodePeerAccessibilityMorse("peer code")).toThrow(/unsupported/);
    expect(() => decodePeerAccessibilityMorse("... --- ... /")).toThrow(/unknown/);
  });
});
