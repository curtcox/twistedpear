/**
 * Per-reason, per-peer announce-ingress drop census for host status surfaces.
 * Counts SPEC-EVENTS `observe/drop` intents; adapters own the storage.
 */
import type { ObserveDropIntent, ObserveDropReason, ObserveDropStage } from "@twistedpear/protocol";

export type DropCensusKey = `${ObserveDropStage}:${ObserveDropReason}`;

export interface DropCensusCounts {
  /** Total drops by stage:reason across all peers. */
  readonly byReason: Readonly<Record<string, number>>;
  /** Per destination key → stage:reason → count. */
  readonly byPeer: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export interface DropCensus {
  readonly record: (drop: ObserveDropIntent) => void;
  readonly snapshot: () => DropCensusCounts;
}

export function dropCensusKey(stage: ObserveDropStage, reason: ObserveDropReason): DropCensusKey {
  return `${stage}:${reason}`;
}

export function createDropCensus(): DropCensus {
  const byReason = new Map<string, number>();
  const byPeer = new Map<string, Map<string, number>>();

  const bump = (map: Map<string, number>, key: string): void => {
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  return {
    record(drop) {
      const key = dropCensusKey(drop.stage, drop.reason);
      bump(byReason, key);
      if (drop.destinationKey !== undefined) {
        let peer = byPeer.get(drop.destinationKey);
        if (peer === undefined) {
          peer = new Map();
          byPeer.set(drop.destinationKey, peer);
        }
        bump(peer, key);
      }
    },
    snapshot() {
      const byReasonOut: Record<string, number> = {};
      for (const [key, count] of byReason) {
        byReasonOut[key] = count;
      }
      const byPeerOut: Record<string, Record<string, number>> = {};
      for (const [peer, reasons] of byPeer) {
        const peerOut: Record<string, number> = {};
        for (const [key, count] of reasons) {
          peerOut[key] = count;
        }
        byPeerOut[peer] = peerOut;
      }
      return { byReason: byReasonOut, byPeer: byPeerOut };
    }
  };
}
