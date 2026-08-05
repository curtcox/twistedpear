import { describe, expect, it } from "vitest";
import { decideLxmfModeration } from "../src/lxmf-moderation.js";

describe("LXMF moderation decision", () => {
  it("blocks before delivery and lets block win over mute", () => {
    expect(
      decideLxmfModeration(
        { blocked: new Set(["alice"]), muted: new Set(["alice"]) },
        "ALICE",
      ),
    ).toEqual({ disposition: "block", deliver: false, notify: false });
  });

  it("delivers muted messages without notification", () => {
    expect(
      decideLxmfModeration(
        { blocked: new Set(), muted: new Set(["alice"]) },
        "alice",
      ),
    ).toEqual({ disposition: "mute", deliver: true, notify: false });
  });

  it("allows unknown senders normally", () => {
    expect(
      decideLxmfModeration({ blocked: new Set(), muted: new Set() }, "alice"),
    ).toEqual({ disposition: "allow", deliver: true, notify: true });
  });
});
