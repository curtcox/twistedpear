export interface AnnounceSubscription {
  readonly namespace: string;
}

export interface AnnounceEvent {
  readonly destination: string;
  readonly appData: Uint8Array;
  readonly receivedAt: number;
}

export type AnnounceWatchHandler = (event: AnnounceEvent) => void;

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
  watch(
    appId: string,
    handler: AnnounceWatchHandler,
    namespace?: string,
  ): () => void;
}

const ANNOUNCE_NAMESPACE_PREFIX = "miniapp-announce:";
/** Matches the RNS announce app_data ceiling used by app-registry. */
export const MAX_ANNOUNCE_APP_DATA_BYTES = 383;

class AnnounceServiceError extends Error {
  constructor(
    readonly code: "ANNOUNCE_CROSS_APP_SCOPE" | "ANNOUNCE_BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "AnnounceServiceError";
  }
}

function announceNamespaceFor(appId: string): string {
  return `${ANNOUNCE_NAMESPACE_PREFIX}${appId}`;
}

/**
 * Own-namespace policy: omitted (default prefix), the app id, the default
 * prefix, or a sub-topic under that prefix. Anything else is a cross-app escape.
 */
export function resolveAnnounceNamespace(
  appId: string,
  namespace?: string,
): string {
  const own = announceNamespaceFor(appId);
  if (namespace === undefined || namespace === own || namespace === appId)
    return own;
  if (namespace.startsWith(`${own}/`)) return namespace;
  throw new AnnounceServiceError(
    "ANNOUNCE_CROSS_APP_SCOPE",
    "Cross-app announce namespaces are not permitted",
  );
}

export function boundAnnounceAppData(appData?: Uint8Array): Uint8Array {
  const bytes = appData ?? new Uint8Array();
  if (bytes.length > MAX_ANNOUNCE_APP_DATA_BYTES) {
    throw new AnnounceServiceError(
      "ANNOUNCE_BAD_REQUEST",
      `Announce appData exceeds ${MAX_ANNOUNCE_APP_DATA_BYTES} bytes`,
    );
  }
  return bytes;
}

export class AnnounceService implements AnnounceBackend {
  private readonly events = new Map<string, AnnounceEvent[]>();
  private readonly watchers = new Map<string, Set<AnnounceWatchHandler>>();

  publish(
    appId: string,
    appData?: Uint8Array,
    namespace?: string,
  ): Promise<void> {
    const key = resolveAnnounceNamespace(appId, namespace);
    const payload = boundAnnounceAppData(appData);
    const bucket = this.events.get(key) ?? [];
    bucket.push({
      destination: appId,
      appData: payload,
      receivedAt: Date.now(),
    });
    this.events.set(key, bucket);
    const event = bucket[bucket.length - 1]!;
    for (const handler of this.watchers.get(key) ?? []) {
      handler(event);
    }
    return Promise.resolve();
  }

  subscribe(
    appId: string,
    namespace?: string,
  ): Promise<ReadonlyArray<AnnounceEvent>> {
    const key = resolveAnnounceNamespace(appId, namespace);
    return Promise.resolve([...(this.events.get(key) ?? [])]);
  }

  watch(
    appId: string,
    handler: AnnounceWatchHandler,
    namespace?: string,
  ): () => void {
    const key = resolveAnnounceNamespace(appId, namespace);
    const bucket = this.watchers.get(key) ?? new Set();
    bucket.add(handler);
    this.watchers.set(key, bucket);
    return () => {
      bucket.delete(handler);
      if (bucket.size === 0) this.watchers.delete(key);
    };
  }
}
