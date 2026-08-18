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

  it("blocks a named app independently of the source hash", () => {
    expect(
      decideLxmfModeration(
        {
          blocked: new Set(),
          muted: new Set(),
          blockedApps: new Set(["inviter"]),
        },
        "alice",
        "inviter",
      ),
    ).toEqual({ disposition: "block", deliver: false, notify: false });
    expect(
      decideLxmfModeration(
        {
          blocked: new Set(),
          muted: new Set(),
          blockedApps: new Set(["inviter"]),
        },
        "alice",
        "notes",
      ),
    ).toEqual({ disposition: "allow", deliver: true, notify: true });
  });

  it("allows unknown senders normally", () => {
    expect(
      decideLxmfModeration({ blocked: new Set(), muted: new Set() }, "alice"),
    ).toEqual({ disposition: "allow", deliver: true, notify: true });
  });
});
