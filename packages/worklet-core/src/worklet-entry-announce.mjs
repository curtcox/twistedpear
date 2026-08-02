import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";

export function createRegisterAnnounceHandler(deps) {
  return function registerAnnounceHandler() {
    const reticulum = deps.getReticulum();
    if (reticulum === null) return;

    reticulum.registerAnnounceHandler({
      receivedAnnounce(info) {
        deps.status.announcesSeen += 1;
        deps.pushStatus();
        deps.send({
          type: "announce",
          entry: {
            destinationHash: bytesToHex(info.destinationHash),
            hops: info.packet.hops,
            receivedAt: Date.now(),
            appDataHex: info.appData === null ? null : bytesToHex(info.appData)
          }
        });

        if (info.appData !== null) {
          deps.ingestCasLocator(info.appData);
          void deps.respondToCasLocatorRequest(info.appData).catch((error) => {
            deps.log(`CAS locator response failed: ${error instanceof Error ? error.message : String(error)}`);
          });
          const { catalogStore: catalog } = deps.ensureCatalog();
          const ingested = catalog.ingest({
            destinationHash: bytesToHex(info.destinationHash),
            appData: info.appData
          });
          if (ingested !== null) {
            deps.log(`Catalog: ${ingested.name} v${ingested.version}`);
            void deps.persistCatalogState();
            deps.pushCatalog();
          }
        }
      }
    });
  };
}
