import {
  boundAnnounceAppData,
  resolveAnnounceNamespace,
  type AnnounceBackend,
  type AnnounceEvent,
  type AnnounceWatchHandler,
} from "./announce.js";

export interface AnnounceTransport {
  publish(namespace: string, event: AnnounceEvent): Promise<void>;
  snapshot(namespace: string): Promise<ReadonlyArray<AnnounceEvent>>;
  watch?(namespace: string, handler: AnnounceWatchHandler): () => void;
}

/** Host adapter that keeps app namespace policy separate from Reticulum/radio effects. */
export class TransportBackedAnnounceService implements AnnounceBackend {
  constructor(
    private readonly destination: string,
    private readonly transport: AnnounceTransport,
  ) {}
  async publish(
    appId: string,
    appData = new Uint8Array(),
    namespace?: string,
  ): Promise<void> {
    return this.transport.publish(resolveAnnounceNamespace(appId, namespace), {
      destination: this.destination,
      appData: boundAnnounceAppData(appData),
      receivedAt: Date.now(),
    });
  }
  async subscribe(
    appId: string,
    namespace?: string,
  ): Promise<ReadonlyArray<AnnounceEvent>> {
    return this.transport.snapshot(resolveAnnounceNamespace(appId, namespace));
  }

  watch(
    appId: string,
    handler: AnnounceWatchHandler,
    namespace?: string,
  ): () => void {
    const key = resolveAnnounceNamespace(appId, namespace);
    return this.transport.watch?.(key, handler) ?? (() => undefined);
  }
}

/** Deterministic two-host transport used by conformance; each host still owns a distinct service. */
export class MemoryAnnounceTransport implements AnnounceTransport {
  private readonly buckets = new Map<string, AnnounceEvent[]>();
  private readonly watchers = new Map<string, Set<AnnounceWatchHandler>>();
  constructor(private readonly maxEventsPerNamespace = 256) {}
  publish(namespace: string, event: AnnounceEvent): Promise<void> {
    const stored = { ...event, appData: event.appData.slice() };
    const bucket = this.buckets.get(namespace) ?? [];
    bucket.push(stored);
    this.buckets.set(namespace, bucket.slice(-this.maxEventsPerNamespace));
    for (const handler of this.watchers.get(namespace) ?? []) {
      handler({ ...stored, appData: stored.appData.slice() });
    }
    return Promise.resolve();
  }
  snapshot(namespace: string): Promise<ReadonlyArray<AnnounceEvent>> {
    return Promise.resolve(
      (this.buckets.get(namespace) ?? []).map((event) => ({
        ...event,
        appData: event.appData.slice(),
      })),
    );
  }
  watch(namespace: string, handler: AnnounceWatchHandler): () => void {
    const bucket = this.watchers.get(namespace) ?? new Set();
    bucket.add(handler);
    this.watchers.set(namespace, bucket);
    return () => {
      bucket.delete(handler);
      if (bucket.size === 0) this.watchers.delete(namespace);
    };
  }
}
