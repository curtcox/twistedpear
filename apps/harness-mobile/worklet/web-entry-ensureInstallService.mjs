/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/web.js";
import { createWebInstallService } from "./web-install.mjs";
import {
  casRequestAspects,
  encodeCasLocatorRequest,
} from "../../../packages/cas-256t/dist/index.js";

export function ensureInstallServiceImpl(context) {
  if (context.installService === null) {
    context.installService = createWebInstallService({
      provider: context.cryptoProvider,
      kvStore: context.ensureMiniappKvStore(),
      getHostSession: () => context.hostSession,
      requestCasLocator: async (t256) => {
        const session = context.hostSession;
        if (session === null) {
          throw new Error("Gateway link is offline — cannot request locator");
        }
        let destination = context.locatorRequestDestinations.get(t256);
        if (destination === undefined) {
          destination = session.reticulum.registerDestination({
            provider: context.cryptoProvider,
            identity: session.identity,
            direction: DestinationDirection.IN,
            type: DestinationType.SINGLE,
            appName: "tp",
            aspects: casRequestAspects(t256),
          });
          context.locatorRequestDestinations.set(t256, destination);
        }
        await destination.announce({ appData: encodeCasLocatorRequest(t256) });
        context.log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
      },
      ensurePackageStorage: context.ensurePackageStorage,
      miniappHost: () => context.ensureMiniappHost(),
      send: context.send,
      log: context.log,
      pushInstalled: () => {
        void context.pushInstalledList();
      },
      requestHostReply: context.requestHostReply,
      tryHyperdriveFetch: async (locator) => {
        if (context.webConfig.gatewayUrl.length === 0) {
          return null;
        }
        if (locator.driveKey.length === 0 || /^0+$/.test(locator.driveKey)) {
          return null;
        }
        const hyperFetch = await context.loadHyperFetch();
        return hyperFetch.fetchDriveVersionForWeb({
          gatewayUrl: context.webConfig.gatewayUrl,
          driveKeyHex: locator.driveKey,
          version: locator.version,
          timeoutMs: 90000,
        });
      },
    });
  }
  return context.installService;
}
