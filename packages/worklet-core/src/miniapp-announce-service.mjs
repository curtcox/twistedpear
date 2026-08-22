/* global TextEncoder */
/**
 * Mini-app announce publish/subscribe over Reticulum destinations.
 *
 * @param {{
 *   provider: { sha256(data: Uint8Array): Uint8Array },
 *   bytesToHex: (bytes: Uint8Array) => string,
 *   DestinationDirection: { IN: unknown },
 *   DestinationType: { SINGLE: unknown },
 *   getNode: () => Promise<{ registerDestination: Function, registerAnnounceHandler: Function }>,
 *   getIdentity: () => Promise<unknown | null>,
 *   requireIdentity?: boolean,
 *   copyAppData?: boolean
 * }} options
 */
export function createMiniappAnnounceService(options) {
  const provider = options.provider;
  const bytesToHex = options.bytesToHex;
  const DestinationDirection = options.DestinationDirection;
  const DestinationType = options.DestinationType;
  const getNode = options.getNode;
  const getIdentity = options.getIdentity;
  const requireIdentity = options.requireIdentity === true;
  const copyAppData = options.copyAppData !== false;

  const buckets = new Map();
  const destinations = new Map();
  const handlers = new Set();
  const watchers = new Map();

  function ownNamespace(appId) {
    return `miniapp-announce:${appId}`;
  }

  function resolveNamespace(appId, namespace) {
    const own = ownNamespace(appId);
    if (namespace === undefined || namespace === own || namespace === appId)
      return own;
    if (typeof namespace === "string" && namespace.startsWith(`${own}/`)) {
      return namespace;
    }
    const error = new Error("Cross-app announce namespaces are not permitted");
    error.code = "ANNOUNCE_CROSS_APP_SCOPE";
    error.name = "AnnounceServiceError";
    throw error;
  }

  function boundAppData(appData) {
    const payload = appData ?? new Uint8Array();
    if (payload.length > 383) {
      const error = new Error(`Announce appData exceeds 383 bytes`);
      error.code = "ANNOUNCE_BAD_REQUEST";
      error.name = "AnnounceServiceError";
      throw error;
    }
    return payload;
  }

  function aspectFor(appId, namespace) {
    const scope = resolveNamespace(appId, namespace);
    return bytesToHex(
      provider.sha256(new TextEncoder().encode(scope)).subarray(0, 16),
    );
  }

  function storeAppData(appData) {
    const payload = appData ?? new Uint8Array();
    return copyAppData ? payload.slice() : payload;
  }

  return {
    async publish(appId, appData, namespace) {
      const node = await getNode();
      const identity = await getIdentity();
      if (requireIdentity && identity === null) {
        throw new Error("Unlock the host identity before publishing announces");
      }
      const aspect = aspectFor(appId, namespace);
      let destination = destinations.get(aspect);
      if (destination === undefined) {
        destination = node.registerDestination({
          provider,
          identity,
          direction: DestinationDirection.IN,
          type: DestinationType.SINGLE,
          appName: "tp",
          aspects: ["miniapp", aspect],
        });
        destinations.set(aspect, destination);
      }
      const payload = boundAppData(appData);
      await destination.announce({ appData: payload });
      const bucket = buckets.get(aspect) ?? [];
      bucket.push({
        destination: bytesToHex(destination.hash),
        appData: storeAppData(payload),
        receivedAt: Date.now(),
      });
      buckets.set(aspect, bucket.slice(-256));
      const event = bucket[bucket.length - 1];
      for (const handler of watchers.get(aspect) ?? []) {
        handler(event);
      }
    },

    async subscribe(appId, namespace) {
      const node = await getNode();
      const aspect = aspectFor(appId, namespace);
      if (!handlers.has(aspect)) {
        node.registerAnnounceHandler({
          aspectFilter: `tp.miniapp.${aspect}`,
          receivedAnnounce(info) {
            const bucket = buckets.get(aspect) ?? [];
            bucket.push({
              destination: bytesToHex(info.destinationHash),
              appData: storeAppData(info.appData ?? new Uint8Array()),
              receivedAt: Date.now(),
            });
            buckets.set(aspect, bucket.slice(-256));
            const event = bucket[bucket.length - 1];
            for (const handler of watchers.get(aspect) ?? []) {
              handler(event);
            }
          },
        });
        handlers.add(aspect);
      }
      return [...(buckets.get(aspect) ?? [])];
    },

    watch(appId, handler, namespace) {
      const aspect = aspectFor(appId, namespace);
      const bucket = watchers.get(aspect) ?? new Set();
      bucket.add(handler);
      watchers.set(aspect, bucket);
      return () => {
        bucket.delete(handler);
        if (bucket.size === 0) watchers.delete(aspect);
      };
    },
  };
}
