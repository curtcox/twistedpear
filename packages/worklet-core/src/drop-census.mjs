/**
 * Lightweight announce-ingress drop census for Bare/Node worklets.
 * Mirrors packages/host-core/src/drop-census.ts without a TS build dependency.
 */
export function createDropCensus() {
  const byReason = new Map();
  const byPeer = new Map();

  const bump = (map, key) => {
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  return {
    record(drop) {
      const key = `${drop.stage}:${drop.reason}`;
      bump(byReason, key);
      if (typeof drop.destinationKey === "string") {
        let peer = byPeer.get(drop.destinationKey);
        if (peer === undefined) {
          peer = new Map();
          byPeer.set(drop.destinationKey, peer);
        }
        bump(peer, key);
      }
    },
    snapshot() {
      const byReasonOut = {};
      for (const [key, count] of byReason) {
        byReasonOut[key] = count;
      }
      const byPeerOut = {};
      for (const [peer, reasons] of byPeer) {
        const peerOut = {};
        for (const [key, count] of reasons) {
          peerOut[key] = count;
        }
        byPeerOut[peer] = peerOut;
      }
      return { byReason: byReasonOut, byPeer: byPeerOut };
    }
  };
}
