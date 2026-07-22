import type { EstablishedPeer, PeerDiscoveryKind } from "./index.js";
import { PeerDiscoveryError } from "./index.js";

const MAX_ROUTE_PAYLOAD_BYTES = 64 * 1024;

/** Host-owned authenticated transport. This object must never cross the mini-app broker. */
export interface HostPeerRoute {
  send(payload: Uint8Array): void | Promise<void>;
}

export interface ConfirmedPeerRoute {
  readonly ownerId: string;
  readonly service: string;
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly rendezvous: PeerDiscoveryKind;
  readonly dataPlane: EstablishedPeer["dataPlane"];
  readonly connectedAt: number;
  readonly transport?: HostPeerRoute;
}

export type ConfirmedPeerRouteListener = (routes: ReadonlyArray<ConfirmedPeerRoute>) => void;

/**
 * Single host-side source of truth for authenticated routes. Presence can observe it while
 * announce, LXMF, Resource, or another host service can resolve the same transport record.
 */
export class ConfirmedPeerRouteRegistry {
  private readonly entries = new Map<string, ConfirmedPeerRoute>();
  private readonly listeners = new Set<ConfirmedPeerRouteListener>();

  attach(ownerId: string, service: string, peer: EstablishedPeer, connectedAt = Date.now()): ConfirmedPeerRoute {
    const entry: ConfirmedPeerRoute = {
      ownerId,
      service,
      fingerprint: peer.fingerprint,
      displayLabel: peer.displayLabel,
      rendezvous: peer.rendezvous,
      dataPlane: peer.dataPlane,
      connectedAt,
      ...(peer.route === undefined ? {} : { transport: peer.route })
    };
    this.entries.set(ownerId, entry);
    this.publish();
    return entry;
  }

  detach(ownerId: string): void {
    if (this.entries.delete(ownerId)) this.publish();
  }

  list(): ReadonlyArray<ConfirmedPeerRoute> {
    return [...this.entries.values()];
  }

  resolve(fingerprint: string, service?: string): ConfirmedPeerRoute | undefined {
    return this.list().find((entry) => entry.fingerprint === fingerprint && (service === undefined || entry.service === service));
  }

  async send(fingerprint: string, payload: Uint8Array, service?: string): Promise<void> {
    if (payload.length > MAX_ROUTE_PAYLOAD_BYTES) {
      throw new PeerDiscoveryError("QUOTA_EXCEEDED", "Peer route payload exceeds 64 KiB");
    }
    const entry = this.resolve(fingerprint, service);
    if (entry?.transport === undefined) {
      throw new PeerDiscoveryError("NO_RETURN_CHANNEL", "Confirmed peer route has no direct transport");
    }
    await entry.transport.send(payload.slice());
  }

  subscribe(listener: ConfirmedPeerRouteListener): () => void {
    this.listeners.add(listener);
    listener(this.list());
    return () => this.listeners.delete(listener);
  }

  private publish(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) listener(snapshot);
  }
}
