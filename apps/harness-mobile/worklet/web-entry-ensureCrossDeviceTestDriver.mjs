/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import {
  bytesToHex,
  loadOrCreateWebIdentity,
} from "../../../packages/reticulum-ts/dist/web.js";
import { createCrossDeviceTestDriver } from "../../../packages/worklet-core/src/index.mjs";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
} from "../../../packages/app-registry/dist/index.js";
import { CasStore } from "../../../packages/cas-256t/dist/index.js";

export function ensureCrossDeviceTestDriverImpl(context) {
  if (context.crossDeviceTestDriver === null) {
    context.crossDeviceTestDriver = createCrossDeviceTestDriver({
      miniappHost: () => context.ensureMiniappHost(),
      installFromT256: (t256) =>
        context.ensureInstallService().installFromT256(t256),
      async importTrust(identity256t, label) {
        const publisherPublicKey = decodePublisherIdentity256t(identity256t);
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: bytesToHex(context.cryptoProvider.randomBytes(16)),
          kind: "trust-import",
          appId: "host",
          publisherPublicKey,
          summary: { label, source: "paste" },
        });
        if (reply?.approved !== true)
          throw new Error("Publisher trust import denied");
        await context.ensureInstallService().trustStore.add({
          publisherPublicKey,
          label,
          addedAt: Date.now(),
          source: "paste",
        });
      },
      async runApp(appId) {
        await context
          .ensureMiniappHost()
          .launch(await context.ensurePackageStorage(), appId);
      },
      casStore: () =>
        new CasStore(context.ensureMiniappKvStore(), (data) =>
          context.cryptoProvider.sha512(data),
        ),
      sha512: (bytes) => context.cryptoProvider.sha512(bytes),
      async casHas(t256) {
        const cas = new CasStore(context.ensureMiniappKvStore(), (data) =>
          context.cryptoProvider.sha512(data),
        );
        return cas.has(t256);
      },
      async publisherIdentity256t() {
        const identity = await loadOrCreateWebIdentity(
          context.cryptoProvider,
          context.identityOptions(),
        );
        return encodePublisherIdentity256t(identity.getPublicKey());
      },
    });
  }
  return context.crossDeviceTestDriver;
}
