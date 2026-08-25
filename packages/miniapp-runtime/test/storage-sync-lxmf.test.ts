import { describe, expect, it } from "vitest";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
  type EgressOffer,
  type EgressTargetKind,
} from "@twistedpear/protocol";
import { EgressBudgetLedger, EgressDeniedError } from "../src/index.js";
import { TopicLogStore } from "../src/index.js";
import {
  LxmfReplicaLink,
  type ReplicaEgressAuth,
} from "../src/services/storage-sync-lxmf.js";

function grant(input: {
  readonly id: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly maxBytesPerDay?: number;
}): EgressOffer {
  const store = stepEgressOfferStore(initialEgressOfferStore(), {
    kind: "egress/grant",
    offer: {
      id: input.id,
      appId: "board",
      capability: "storage:sync",
      targetKind: input.targetKind,
      targetId: input.targetId,
      displayLabel: input.targetId,
      constraints:
        input.maxBytesPerDay === undefined
          ? {}
          : { maxBytesPerDay: input.maxBytesPerDay },
      grantedAt: 0,
    },
    ttlMs: 60_000,
  });
  const offer = store.get(input.id);
  if (offer === undefined) throw new Error(`missing offer ${input.id}`);
  return offer;
}

function auth(
  offer: EgressOffer,
  ledger: EgressBudgetLedger,
): ReplicaEgressAuth {
  return {
    offers: new Map([[offer.id, offer]]),
    appId: "board",
    targetKind: offer.targetKind,
    targetId: offer.targetId,
    at: () => 1_000,
    ledger,
  };
}

function peerLink(maxBytesPerDay?: number): LxmfReplicaLink {
  const ledger = new EgressBudgetLedger();
  const east = grant({
    id: "east",
    targetKind: "peer",
    targetId: "device-b",
    maxBytesPerDay,
  });
  const west = grant({
    id: "west",
    targetKind: "peer",
    targetId: "device-a",
    maxBytesPerDay,
  });
  return new LxmfReplicaLink(
    new TopicLogStore({ authorId: "device-a" }),
    new TopicLogStore({ authorId: "device-b" }),
    "board",
    auth(east, ledger),
    auth(west, ledger),
  );
}

describe("lxmf storage:sync replication", () => {
  it("refuses a round when no offer is live", () => {
    const ledger = new EgressBudgetLedger();
    const empty: ReplicaEgressAuth = {
      offers: initialEgressOfferStore(),
      appId: "board",
      targetKind: "peer",
      targetId: "device-b",
      at: () => 1_000,
      ledger,
    };
    const link = new LxmfReplicaLink(
      new TopicLogStore({ authorId: "device-a" }),
      new TopicLogStore({ authorId: "device-b" }),
      "board",
      empty,
      empty,
    );
    link.local.set("board", "slot/a", { holder: "a" });
    expect(() => link.round()).toThrow(EgressDeniedError);
    expect(link.remote.view("board").size).toBe(0);
  });

  it("converges version-vector diffs after a peer offer and meters bytes", () => {
    const link = peerLink(50_000);
    link.local.set("board", "slot/a", { holder: "a" });
    link.remote.set("board", "slot/b", { holder: "b" });
    const bytes = link.round();
    expect(bytes).toBeGreaterThan(0);
    expect(link.converged()).toBe(true);
    expect(link.local.view("board").get("slot/a")?.payload).toEqual({
      holder: "a",
    });
    expect(link.remote.view("board").get("slot/b")?.payload).toEqual({
      holder: "b",
    });
  });

  it("converges under a group offer for the topic peer set", () => {
    const ledger = new EgressBudgetLedger();
    const east = grant({
      id: "east",
      targetKind: "group",
      targetId: "board-peers",
    });
    const west = grant({
      id: "west",
      targetKind: "group",
      targetId: "board-peers",
    });
    const link = new LxmfReplicaLink(
      new TopicLogStore({ authorId: "device-a" }),
      new TopicLogStore({ authorId: "device-b" }),
      "board",
      auth(east, ledger),
      auth(west, ledger),
    );
    link.local.set("board", "note", "hello");
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.remote.view("board").get("note")?.payload).toBe("hello");
  });

  it("leaves the remote unchanged when the daily budget is exhausted", () => {
    const link = peerLink(8);
    link.local.set("board", "slot/a", { holder: "a" });
    expect(() => link.round()).toThrow(EgressDeniedError);
    expect(link.remote.view("board").size).toBe(0);
  });
});
