import type { AnnounceBackend, AnnounceEvent } from "./announce.js";

export interface AnnounceTransport {
  publish(namespace: string, event: AnnounceEvent): Promise<void>;
  snapshot(namespace: string): Promise<ReadonlyArray<AnnounceEvent>>;
}

/** Host adapter that keeps app namespace policy separate from Reticulum/radio effects. */
export class TransportBackedAnnounceService implements AnnounceBackend {
  constructor(
    private readonly destination: string,
    private readonly transport: AnnounceTransport,
  ) {}
  publish(
    appId: string,
    appData = new Uint8Array(),
    namespace?: string,
  ): Promise<void> {
    return this.transport.publish(namespace ?? `miniapp-announce:${appId}`, {
      destination: this.destination,
      appData,
      receivedAt: Date.now(),
    });
  }
  subscribe(
    appId: string,
    namespace?: string,
  ): Promise<ReadonlyArray<AnnounceEvent>> {
    return this.transport.snapshot(namespace ?? `miniapp-announce:${appId}`);
  }
}

/** Deterministic two-host transport used by conformance; each host still owns a distinct service. */
export class MemoryAnnounceTransport implements AnnounceTransport {
  private readonly buckets = new Map<string, AnnounceEvent[]>();
  constructor(private readonly maxEventsPerNamespace = 256) {}
  async publish(namespace: string, event: AnnounceEvent): Promise<void> {
    const bucket = this.buckets.get(namespace) ?? [];
    bucket.push({ ...event, appData: event.appData.slice() });
    this.buckets.set(namespace, bucket.slice(-this.maxEventsPerNamespace));
  }
  async snapshot(namespace: string): Promise<ReadonlyArray<AnnounceEvent>> {
    return (this.buckets.get(namespace) ?? []).map((event) => ({
      ...event,
      appData: event.appData.slice(),
    }));
  }
}
