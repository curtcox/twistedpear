/**
 * Desktop host test-support wiring: publisher trust import and the cross-device
 * conformance driver. Only reachable from the harness test agent.
 */
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t
} from "../../../packages/app-registry/dist/index.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createCrossDeviceTestDriver } from "../../../packages/worklet-core/src/index.mjs";

export function createTestSupportOps(deps) {
  const { state, provider, runtime, requestRendererReply } = deps;
  const ensureTrustStore = (...args) => deps.ensureTrustStore(...args);
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const ensureCatalog = (...args) => deps.ensureCatalog(...args);
  const ensureEntryCasStore = (...args) => deps.ensureEntryCasStore(...args);
  const installFromT256 = (...args) => deps.installFromT256(...args);
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);

  async function importTrustedPublisherForTest(identityString, label) {
    const publisherPublicKey = decodePublisherIdentity256t(identityString);
    const confirmation = await requestRendererReply({
      type: "confirm-request",
      token: generateConfirmationToken((length) => provider.randomBytes(length)),
      kind: "trust-import",
      appId: "host",
      publisherPublicKey,
      summary: { label, source: "paste" }
    });
    if (confirmation?.approved !== true) throw new Error("Publisher trust import denied");
    await ensureTrustStore().add({
      publisherPublicKey,
      label,
      addedAt: Date.now(),
      source: "paste"
    });
  }

  function ensureCrossDeviceTestDriver() {
    if (state.crossDeviceTestDriver === null) {
      state.crossDeviceTestDriver = createCrossDeviceTestDriver({
        miniappHost: () => ensureMiniappHost(),
        installedStore: () => ensureCatalog().installedStore,
        runtime,
        installFromT256,
        importTrust: importTrustedPublisherForTest,
        casStore: () => ensureEntryCasStore(),
        sha512: (bytes) => provider.sha512(bytes),
        async publisherIdentity256t() {
          const identity = await resolveIdentity();
          if (identity === null) throw new Error("Host identity is unavailable");
          return encodePublisherIdentity256t(identity.getPublicKey());
        }
      });
    }
    return state.crossDeviceTestDriver;
  }

  return { importTrustedPublisherForTest, ensureCrossDeviceTestDriver };
}
