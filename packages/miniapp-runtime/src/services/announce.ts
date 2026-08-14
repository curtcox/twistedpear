export interface AnnounceSubscription {
  readonly namespace: string;
}

export interface AnnounceEvent {
  readonly destination: string;
  readonly appData: Uint8Array;
  readonly receivedAt: number;
}

export interface AnnounceBackend {
  publish(
    appId: string,
    appData?: Uint8Array,
    namespace?: string,
  ): Promise<void>;
  subscribe(
    appId: string,
    namespace?: string,
  ): Promise<ReadonlyArray<AnnounceEvent>>;
}

export class AnnounceService implements AnnounceBackend {
  private readonly events = new Map<string, AnnounceEvent[]>();

  publish(
    appId: string,
    appData?: Uint8Array,
    namespace?: string,
  ): Promise<void> {
    const key = namespace ?? this.namespaceFor(appId);
    const bucket = this.events.get(key) ?? [];
    bucket.push({
      destination: appId,
      appData: appData ?? new Uint8Array(),
      receivedAt: Date.now(),
    });
    this.events.set(key, bucket);
    return Promise.resolve();
  }

  subscribe(
    appId: string,
    namespace?: string,
  ): Promise<ReadonlyArray<AnnounceEvent>> {
    const key = namespace ?? this.namespaceFor(appId);
    return Promise.resolve([...(this.events.get(key) ?? [])]);
  }

  private namespaceFor(appId: string): string {
    return `miniapp-announce:${appId}`;
  }
}
