export interface AnnounceSubscription {
  readonly namespace: string;
}

export interface AnnounceEvent {
  readonly destination: string;
  readonly appData: Uint8Array;
  readonly receivedAt: number;
}

export interface AnnounceBackend {
  publish(appId: string, appData?: Uint8Array): Promise<void>;
  subscribe(appId: string, namespace: string): Promise<ReadonlyArray<AnnounceEvent>>;
}

export class AnnounceService implements AnnounceBackend {
  private readonly events = new Map<string, AnnounceEvent[]>();

  async publish(appId: string, appData?: Uint8Array): Promise<void> {
    const namespace = this.namespaceFor(appId);
    const bucket = this.events.get(namespace) ?? [];
    bucket.push({
      destination: appId,
      appData: appData ?? new Uint8Array(),
      receivedAt: Date.now()
    });
    this.events.set(namespace, bucket);
  }

  async subscribe(_appId: string, namespace: string): Promise<ReadonlyArray<AnnounceEvent>> {
    return [...(this.events.get(namespace) ?? [])];
  }

  private namespaceFor(appId: string): string {
    return `miniapp-announce:${appId}`;
  }
}
