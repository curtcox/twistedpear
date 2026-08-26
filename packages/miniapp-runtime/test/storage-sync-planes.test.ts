import { describe, expect, it } from "vitest";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
  type EgressOffer,
  type EgressTargetKind,
  type LinkSupply,
  type StreamPlane,
} from "@twistedpear/protocol";
import { EgressBudgetLedger } from "../src/index.js";
import { TopicLogStore } from "../src/index.js";
import { type ReplicaEgressAuth } from "../src/services/storage-sync-lxmf.js";
import {
  DEFAULT_REPLICA_BULK_BPS,
  PlaneReplicaLink,
  REPLICA_RESERVATION_CLASS,
  ReplicaPlaneError,
  reserveReplicaBulk,
  selectReplicaPlane,
  type ReplicaBandwidthLimiter,
  type ReplicaBandwidthReservation,
  type ReplicaReservationClass,
} from "../src/services/storage-sync-planes.js";

function grant(input: {
  readonly id: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
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
      constraints: {},
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

function supply(plane: StreamPlane, bps: number): LinkSupply {
  return { plane, effectiveBps: bps, headroomBps: Math.max(bps, 1) };
}

class MemoryLimiter implements ReplicaBandwidthLimiter {
  readonly committed: ReplicaBandwidthReservation[] = [];

  constructor(readonly bytesPerSecond: number) {}

  reserve(
    reservationClass: ReplicaReservationClass,
    bytesPerSecond: number,
  ): ReplicaBandwidthReservation | null {
    const classCap =
      reservationClass === "realtime"
        ? Math.floor(this.bytesPerSecond * 0.6)
        : this.bytesPerSecond;
    const classUsed = this.committed
      .filter((entry) => entry.class === reservationClass)
      .reduce((sum, entry) => sum + entry.bytesPerSecond, 0);
    const total = this.committed.reduce(
      (sum, entry) => sum + entry.bytesPerSecond, 0,
    );
    if (
      classUsed + bytesPerSecond > classCap ||
      total + bytesPerSecond > this.bytesPerSecond
    ) {
      return null;
    }
    const entry: ReplicaBandwidthReservation = {
      class: reservationClass,
      bytesPerSecond,
      release: () => {
        const index = this.committed.indexOf(entry);
        if (index >= 0) this.committed.splice(index, 1);
      },
    };
    this.committed.push(entry);
    return entry;
  }
}

function peerLink(
  candidates: ReadonlyArray<LinkSupply>,
  limiter: ReplicaBandwidthLimiter,
  bulkBytesPerSecond: number = DEFAULT_REPLICA_BULK_BPS,
): PlaneReplicaLink {
  const ledger = new EgressBudgetLedger();
  return new PlaneReplicaLink(
    new TopicLogStore({ authorId: "device-a" }),
    new TopicLogStore({ authorId: "device-b" }),
    "board",
    auth(
      grant({ id: "east", targetKind: "peer", targetId: "device-b" }),
      ledger,
    ),
    auth(
      grant({ id: "west", targetKind: "peer", targetId: "device-a" }),
      ledger,
    ),
    candidates,
    limiter,
    bulkBytesPerSecond,
  );
}

describe("storage:sync plane selection", () => {
  it("prefers webrtc over lower SPEC-STREAM planes", () => {
    expect(
      selectReplicaPlane([
        supply("lxmf", 5_000),
        supply("webrtc", 80_000),
        supply("reticulum", 20_000),
      ]).plane,
    ).toBe("webrtc");
  });

  it("skips a dead webrtc plane and lands on reticulum", () => {
    expect(
      selectReplicaPlane([
        supply("webrtc", 0),
        supply("pears-bulk", 0),
        supply("reticulum", 12_000),
        supply("lxmf", 4_000),
      ]).plane,
    ).toBe("reticulum");
  });

  it("refuses a round when every plane has zero supply", () => {
    expect(() =>
      selectReplicaPlane([
        supply("webrtc", 0),
        supply("lxmf", 0),
        supply("cas", 0),
      ]),
    ).toThrow(ReplicaPlaneError);
  });
});

describe("storage:sync bulk reservation", () => {
  it("reserves bulk and never realtime", () => {
    const limiter = new MemoryLimiter(100_000);
    const reservation = reserveReplicaBulk(limiter, 8_192);
    expect(reservation.class).toBe(REPLICA_RESERVATION_CLASS);
    expect(limiter.committed).toEqual([
      expect.objectContaining({ class: "bulk", bytesPerSecond: 8_192 }),
    ]);
    reservation.release();
    expect(limiter.committed).toHaveLength(0);
  });

  it("refuses when realtime already holds the aggregate", () => {
    const limiter = new MemoryLimiter(100);
    expect(limiter.reserve("realtime", 60)).not.toBeNull();
    expect(() => reserveReplicaBulk(limiter, 50)).toThrow(ReplicaPlaneError);
  });

  it("rejects a limiter that tries to hand replica a realtime share", () => {
    const limiter: ReplicaBandwidthLimiter = {
      reserve: () => ({
        class: "realtime",
        bytesPerSecond: 8_192,
        release: () => {},
      }),
    };
    expect(() => reserveReplicaBulk(limiter, 8_192)).toThrow(
      ReplicaPlaneError,
    );
  });
});

describe("plane storage:sync replication", () => {
  it("converges two hosts after selecting lxmf and reserving bulk", () => {
    const limiter = new MemoryLimiter(50_000);
    const link = peerLink([supply("lxmf", 8_000)], limiter);
    expect(link.plane).toBe("lxmf");
    expect(link.reservationClass).toBe("bulk");
    expect(limiter.committed.some((entry) => entry.class === "realtime")).toBe(
      false,
    );
    link.local.set("board", "slot/a", { holder: "a" });
    link.remote.set("board", "slot/b", { holder: "b" });
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.converged()).toBe(true);
    expect(link.remote.view("board").get("slot/a")?.payload).toEqual({
      holder: "a",
    });
    expect(link.local.view("board").get("slot/b")?.payload).toEqual({
      holder: "b",
    });
    link.release();
    expect(limiter.committed).toHaveLength(0);
  });

  it("selects webrtc when that plane has supply and still converges", () => {
    const limiter = new MemoryLimiter(200_000);
    limiter.reserve("realtime", 40_000);
    const link = peerLink(
      [supply("webrtc", 100_000), supply("lxmf", 8_000)],
      limiter,
    );
    expect(link.plane).toBe("webrtc");
    expect(limiter.committed.map((entry) => entry.class).sort()).toEqual([
      "bulk",
      "realtime",
    ]);
    link.local.set("board", "note", "hello");
    expect(link.converge()).toBeGreaterThan(0);
    expect(link.remote.view("board").get("note")?.payload).toBe("hello");
    link.release();
  });

  it("does not open a round when bulk cannot be reserved", () => {
    const limiter = new MemoryLimiter(8_192);
    limiter.reserve("realtime", 4_096);
    limiter.reserve("control", 4_096);
    expect(() => peerLink([supply("lxmf", 8_000)], limiter, 8_192)).toThrow(
      ReplicaPlaneError,
    );
  });
});
