import { enumerateCells } from "@twistedpear/effects";
import { describe, expect, it } from "vitest";
import {
  egressOfferMachine,
  egressOfferPermits,
  initialEgressOfferState,
  initialEgressOfferStore,
  isEgressOfferLive,
  stepEgressOffer,
  stepEgressOfferStore,
} from "../src/index.js";
import vectors from "../../../conformance/vectors/egress-offer.json";

const grantEvent = {
  kind: "egress/grant" as const,
  offer: {
    id: "offer-1",
    appId: "line-check",
    capability: "lxmf:send",
    targetKind: "peer" as const,
    targetId: "peer-a",
    displayLabel: "Ana",
    constraints: { tierId: "pcm", maxRung: "16k-opus" },
    grantedAt: 0,
  },
  ttlMs: 100,
};

describe("egress offer lifecycle table", () => {
  it("contains only the legal lifecycle edges", () => {
    expect(
      egressOfferMachine.table.map(
        (row) => `${row.from}:${row.on.name}->${row.to}`,
      ),
    ).toEqual([
      "absent:grant->active",
      "active:grant->active",
      "expired:grant->active",
      "revoked:grant->active",
      "active:ttl/expired->expired",
      "active:revoke->revoked",
    ]);
    const revoked = {
      ...initialEgressOfferState(),
      phase: "revoked" as const,
      expiresAt: 10,
      revokedAt: 5,
    };
    expect(
      stepEgressOffer(revoked, { kind: "egress/ttl", id: "offer-1", at: 20 }),
    ).toEqual({ state: revoked, intents: [] });
  });

  it("checks in a vector for every table cell", () => {
    expect(vectors.cells).toHaveLength(enumerateCells(egressOfferMachine).length);
    expect(vectors.cells).toHaveLength(
      egressOfferMachine.states.length * egressOfferMachine.events.length,
    );
    expect(vectors.cells.filter((cell) => cell.legal)).toHaveLength(
      egressOfferMachine.table.length,
    );
  });
});

describe("egress offer store", () => {
  it("grants, expires, revokes, and clears on restart", () => {
    let store = initialEgressOfferStore();
    store = stepEgressOfferStore(store, grantEvent);
    const offer = store.get("offer-1");
    expect(isEgressOfferLive(offer, 99)).toBe(true);
    expect(
      egressOfferPermits(offer, {
        appId: "line-check",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        at: 50,
        tierId: "pcm",
        maxRung: "16k-opus",
      }),
    ).toBe(true);
    expect(
      egressOfferPermits(offer, {
        appId: "line-check",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-b",
        at: 50,
        tierId: "pcm",
        maxRung: "16k-opus",
      }),
    ).toBe(false);
    expect(
      egressOfferPermits(offer, {
        appId: "line-check",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        at: 50,
        tierId: "derived",
        maxRung: "16k-opus",
      }),
    ).toBe(false);
    store = stepEgressOfferStore(store, {
      kind: "egress/ttl",
      id: "offer-1",
      at: 100,
    });
    expect(store.get("offer-1")?.phase).toBe("expired");
    expect(isEgressOfferLive(store.get("offer-1"), 100)).toBe(false);
    store = stepEgressOfferStore(store, {
      kind: "egress/clear-sensitive",
      at: 101,
    });
    expect(store.size).toBe(0);
  });

  it("re-grants a revoked id and ignores ttl before expiry", () => {
    let store = initialEgressOfferStore();
    store = stepEgressOfferStore(store, grantEvent);
    store = stepEgressOfferStore(store, {
      kind: "egress/revoke",
      id: "offer-1",
      at: 10,
    });
    expect(store.get("offer-1")?.phase).toBe("revoked");
    store = stepEgressOfferStore(store, {
      ...grantEvent,
      offer: { ...grantEvent.offer, grantedAt: 20 },
      ttlMs: 50,
    });
    expect(isEgressOfferLive(store.get("offer-1"), 60)).toBe(true);
    store = stepEgressOfferStore(store, {
      kind: "egress/ttl",
      id: "offer-1",
      at: 30,
    });
    expect(store.get("offer-1")?.phase).toBe("active");
  });
});
