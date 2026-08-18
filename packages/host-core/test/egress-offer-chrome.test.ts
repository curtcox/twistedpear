import { describe, expect, it } from "vitest";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
} from "@twistedpear/protocol";
import {
  EGRESS_OFFER_REVOKE_LABEL,
  EGRESS_OFFER_SETTINGS_TITLE,
  authorOfferFromNaturalUse,
  presentEgressOfferSettings,
} from "../src/egress-offer-chrome.js";

describe("egress offer chrome", () => {
  it("authors an lxmf:send offer by picking a contact, not a destinations dialog", () => {
    const draft = authorOfferFromNaturalUse({
      kind: "pick-contact",
      appId: "chat",
      peerId: "peer-ada",
      displayLabel: "Ada",
    });
    expect(draft).toEqual({
      appId: "chat",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "peer-ada",
      displayLabel: "Ada",
      constraints: {},
    });
  });

  it("authors a media offer by accepting a call and a peer offer by scanning a QR", () => {
    expect(
      authorOfferFromNaturalUse({
        kind: "accept-call",
        appId: "talk",
        peerId: "peer-ada",
        classId: "microphone",
      }).capability,
    ).toBe("device:stream");
    expect(
      authorOfferFromNaturalUse({
        kind: "scan-qr",
        appId: "talk",
        peerId: "peer-ada",
        displayLabel: "Ada's phone",
      }).capability,
    ).toBe("peer:connect");
  });

  it("lists active offers in settings with a revoke control", () => {
    let store = initialEgressOfferStore();
    store = stepEgressOfferStore(store, {
      kind: "egress/grant",
      ttlMs: 60_000,
      offer: {
        id: "e1",
        appId: "chat",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-ada",
        displayLabel: "Ada",
        constraints: {},
        grantedAt: 10,
      },
    });
    store = stepEgressOfferStore(store, {
      kind: "egress/revoke",
      id: "e1",
      at: 20,
    });
    store = stepEgressOfferStore(store, {
      kind: "egress/grant",
      ttlMs: 60_000,
      offer: {
        id: "e2",
        appId: "chat",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-bob",
        displayLabel: "Bob",
        constraints: {},
        grantedAt: 30,
      },
    });
    const settings = presentEgressOfferSettings([...store.values()]);
    expect(settings.title).toBe(EGRESS_OFFER_SETTINGS_TITLE);
    expect(settings.rows).toEqual([
      {
        id: "e2",
        appId: "chat",
        capability: "lxmf:send",
        displayLabel: "Bob",
        targetId: "peer-bob",
        revokeLabel: EGRESS_OFFER_REVOKE_LABEL,
      },
    ]);
  });
});
