/**
 * Two-host storage:sync proof for the local-multipeer harness: pick a
 * SPEC-STREAM plane, reserve bulk (never realtime), then converge two logs.
 */
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
} from "../../packages/protocol/dist/index.js";
import { EgressBudgetLedger } from "../../packages/miniapp-runtime/dist/egress-enforcement.js";
import { TopicLogStore } from "../../packages/miniapp-runtime/dist/services/storage-sync.js";
import { PlaneReplicaLink } from "../../packages/miniapp-runtime/dist/services/storage-sync-planes.js";
import { BandwidthLimiter } from "../../packages/reticulum-ts/dist/transport/bandwidth.js";

function grant(id, targetId) {
  const store = stepEgressOfferStore(initialEgressOfferStore(), {
    kind: "egress/grant",
    offer: {
      id,
      appId: "board",
      capability: "storage:sync",
      targetKind: "peer",
      targetId,
      displayLabel: targetId,
      constraints: {},
      grantedAt: 0,
    },
    ttlMs: 60_000,
  });
  return store.get(id);
}

function auth(offer, ledger) {
  return {
    offers: new Map([[offer.id, offer]]),
    appId: "board",
    targetKind: offer.targetKind,
    targetId: offer.targetId,
    at: () => 1_000,
    ledger,
  };
}

function wallClock() {
  return {
    now: () => Date.now(),
    setTimeout(callback, milliseconds) {
      const timer = setTimeout(callback, milliseconds);
      return { cancel: () => clearTimeout(timer) };
    },
  };
}

export function proveReplicaPlanes({ assert, step }) {
  const limiter = new BandwidthLimiter(wallClock(), 524_288);
  const realtime = limiter.reserve("realtime", 200_000);
  assert(realtime !== null, "realtime reservation should still admit");

  const ledger = new EgressBudgetLedger();
  const link = new PlaneReplicaLink({
    local: new TopicLogStore({ authorId: "hub" }),
    remote: new TopicLogStore({ authorId: "node2" }),
    topic: "board",
    localAuth: auth(grant("east", "node2"), ledger),
    remoteAuth: auth(grant("west", "hub"), ledger),
    candidates: [
      { plane: "webrtc", effectiveBps: 0, headroomBps: 0 },
      { plane: "pears-bulk", effectiveBps: 0, headroomBps: 0 },
      { plane: "reticulum", effectiveBps: 12_000, headroomBps: 12_000 },
      { plane: "lxmf", effectiveBps: 4_000, headroomBps: 4_000 },
      { plane: "cas", effectiveBps: 0, headroomBps: 0 },
    ],
    limiter,
    bulkBytesPerSecond: 8_192,
  });

  assert(
    link.plane === "reticulum",
    `expected reticulum plane, got ${link.plane}`,
  );
  assert(link.reservationClass === "bulk", "replica reservation must be bulk");
  const snapshot = limiter.reservationSnapshot();
  assert(
    snapshot.some(
      (row) => row.class === "bulk" && row.bytesPerSecond === 8_192,
    ),
    "limiter should hold a bulk replica reservation",
  );
  assert(
    snapshot.some(
      (row) => row.class === "realtime" && row.bytesPerSecond === 200_000,
    ),
    "replica must not consume the realtime reservation",
  );

  link.local.set("board", "slot/a", { holder: "hub" });
  link.remote.set("board", "slot/b", { holder: "node2" });
  const rounds = link.converge();
  assert(link.converged(), "two-host replica logs should converge");
  assert(
    link.remote.view("board").get("slot/a")?.payload.holder === "hub",
    "node2 should receive the hub entry",
  );
  assert(
    link.local.view("board").get("slot/b")?.payload.holder === "node2",
    "hub should receive the node2 entry",
  );
  link.release();
  realtime.release();
  step(
    `replica plane ${link.plane} reserved bulk, converged in ${rounds} round(s)`,
  );
  return {
    plane: link.plane,
    reservationClass: link.reservationClass,
    rounds,
    converged: true,
  };
}
