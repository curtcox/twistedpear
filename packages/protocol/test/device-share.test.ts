import { describe, expect, it } from "vitest";
import {
  initialShareOfferStore,
  isShareOfferLive,
  shareOfferPermits,
  stepShareOfferStore
} from "../src/index.js";

describe("outbound share offer store", () => {
  it("grants, expires, revokes, and clears on restart", () => {
    let store = initialShareOfferStore();
    store = stepShareOfferStore(store, {
      kind: "share/grant",
      offer: {
        id: "offer-1",
        appId: "line-check",
        targetKind: "peer",
        targetId: "peer-a",
        displayLabel: "Ana",
        classId: "microphone",
        tierId: "pcm",
        maxRung: "16k-opus",
        grantedAt: 0
      },
      ttlMs: 100
    });
    const offer = store.get("offer-1");
    expect(isShareOfferLive(offer, 99)).toBe(true);
    expect(shareOfferPermits(offer, {
      appId: "line-check",
      targetId: "peer-a",
      classId: "microphone",
      tierId: "pcm",
      at: 50
    })).toBe(true);
    store = stepShareOfferStore(store, { kind: "share/ttl", id: "offer-1", at: 100 });
    expect(store.get("offer-1")?.phase).toBe("expired");
    store = stepShareOfferStore(store, { kind: "share/clear-sensitive", at: 101 });
    expect(store.size).toBe(0);
  });
});
