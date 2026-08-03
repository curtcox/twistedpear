/* global setTimeout */
// @ts-nocheck

import {
  CasStore,
  casAnnounceAspects,
  casRequestAspects,
  decodeCasLocator,
  decodeCasLocatorRequest,
  encodeCasLocator,
  encodeCasLocatorRequest,
  verifyCasLocator
} from "../../cas-256t/dist/index.js";

export function createCasLocatorOps(deps) {
  let entryCasStore = null;

  function ensureEntryCasStore() {
    if (entryCasStore === null) {
      entryCasStore = new CasStore(deps.runtimeKeyValueStore(), (data) => deps.provider.sha512(data));
    }
    return entryCasStore;
  }

  function ingestCasLocator(appData) {
    try {
      const locator = decodeCasLocator(appData);
      if (verifyCasLocator(deps.provider, locator)) {
        deps.casLocators.set(locator.t256, locator);
        deps.log(`CAS locator: ${locator.appId} v${locator.version}`);
      }
    } catch {
      // Not a TPCL locator payload.
    }
  }

  async function announceCasLocatorRequest(t256) {
    const node = await deps.ensureReticulum();
    const identity = await deps.resolveIdentity();
    if (identity === null) throw new Error("No host identity available for locator request");
    let destination = deps.casRequestDestinations.get(t256);
    if (destination === undefined) {
      destination = node.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: casRequestAspects(t256)
      });
      deps.casRequestDestinations.set(t256, destination);
    }
    await destination.announce({ appData: encodeCasLocatorRequest(t256) });
    deps.log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
  }

  async function respondToCasLocatorRequest(appData) {
    let t256;
    try {
      t256 = decodeCasLocatorRequest(appData);
    } catch {
      return;
    }
    const locator = deps.casLocators.get(t256);
    const reticulum = deps.getReticulum();
    if (locator === undefined || reticulum === null) return;
    const identity = await deps.resolveIdentity();
    if (identity === null) return;
    let destination = deps.casResponseDestinations.get(t256);
    if (destination === undefined) {
      destination = reticulum.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: casAnnounceAspects(t256)
      });
      deps.casResponseDestinations.set(t256, destination);
    }
    await destination.announce({ appData: encodeCasLocator(locator) });
    deps.logReannounce?.(t256);
  }

  async function waitForCasLocator(t256, timeoutMs = 30_000) {
    if (!deps.casLocators.has(t256)) await announceCasLocatorRequest(t256);
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let lastRequestedAt = startedAt;
      const poll = () => {
        const locator = deps.casLocators.get(t256);
        if (locator !== undefined) {
          resolve(locator);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("No locator announce received for that 256t id"));
          return;
        }
        if (Date.now() - lastRequestedAt >= 5_000) {
          lastRequestedAt = Date.now();
          void announceCasLocatorRequest(t256).catch((error) => {
            deps.log?.(`CAS locator re-request failed: ${error instanceof Error ? error.message : String(error)}`);
          });
        }
        setTimeout(poll, 500);
      };
      poll();
    });
  }

  return {
    ensureEntryCasStore,
    ingestCasLocator,
    announceCasLocatorRequest,
    respondToCasLocatorRequest,
    waitForCasLocator
  };
}
