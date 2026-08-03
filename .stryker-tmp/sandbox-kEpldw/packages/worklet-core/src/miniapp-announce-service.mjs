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
// @ts-nocheck

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

  function aspectFor(appId, namespace) {
    const scope = namespace ?? `miniapp-announce:${appId}`;
    return bytesToHex(provider.sha256(new TextEncoder().encode(scope)).subarray(0, 16));
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
          aspects: ["miniapp", aspect]
        });
        destinations.set(aspect, destination);
      }
      const payload = appData ?? new Uint8Array();
      await destination.announce({ appData: payload });
      const bucket = buckets.get(aspect) ?? [];
      bucket.push({
        destination: bytesToHex(destination.hash),
        appData: storeAppData(payload),
        receivedAt: Date.now()
      });
      buckets.set(aspect, bucket.slice(-256));
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
              receivedAt: Date.now()
            });
            buckets.set(aspect, bucket.slice(-256));
          }
        });
        handlers.add(aspect);
      }
      return [...(buckets.get(aspect) ?? [])];
    }
  };
}
