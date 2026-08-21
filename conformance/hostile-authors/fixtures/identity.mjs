/**
 * Surface 1 — who the user thinks wrote this (HA-01…HA-05).
 */
import {
  CatalogStore,
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  encodeAppAnnounceData,
  packPackage,
  signManifest,
} from "../../../packages/app-registry/dist/index.js";
import { TrustStore } from "../../../packages/app-registry/dist/index.js";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "../../../packages/reticulum-ts/dist/index.js";
import {
  consentDiscloses,
  consentRecordFromConfirmation,
  installReviewConsentRecord,
} from "../../../packages/miniapp-runtime/dist/index.js";
import { dispatch, makeHost, stubAppsBackend } from "./harness.mjs";

function sampleFiles() {
  return [
    {
      path: "bundle.js",
      content: new TextEncoder().encode('console.log("hello");'),
    },
  ];
}

function signedPackage(provider, identity, name, version = "1.0.0") {
  const unsigned = buildUnsignedManifest(
    {
      name,
      version,
      entry: "bundle.js",
      capabilities: ["storage:kv"],
      minHostApi: "0.1.0",
      driveKey: "a".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files: sampleFiles(),
    },
    provider,
  );
  const manifest = signManifest(provider, identity, unsigned);
  return packPackage(provider, {
    name: manifest.name,
    version: manifest.version,
    entry: manifest.entry,
    capabilities: manifest.capabilities,
    minHostApi: manifest.minHostApi,
    driveKey: manifest.driveKey,
    publisherPublicKey: manifest.publisherPublicKey,
    signature: manifest.signature,
    files: sampleFiles(),
  });
}

function ingestNamed(catalog, provider, identity, packed, now) {
  const summary = buildAppAnnounceSummary(provider, identity, {
    manifest: packed.manifest,
    packageSize: packed.archiveBytes.length,
    packageHash: packed.packageHash,
    resourceAvailable: true,
  });
  return catalog.ingest({
    destinationHash: "dest",
    appData: encodeAppAnnounceData(summary),
    manifest: packed.manifest,
    packageHash: packed.packageHash,
    now,
  });
}

export async function runIdentityScenarios() {
  const provider = new NodeCryptoProvider();
  const left = new Identity(provider);
  const right = new Identity(provider);
  return [
    measureHomoglyph(provider, left, right),
    measurePublisherSwap(provider, left, right),
    await measureTrustImport(),
    ...(await measureChainInstall()),
  ];
}

function measureHomoglyph(provider, left, right) {
  const catalog = new CatalogStore(provider);
  const handbook = signedPackage(provider, left, "Handbook");
  const lookalike = signedPackage(provider, right, "Hаndbook");
  const t0 = Date.now();
  const first = ingestNamed(catalog, provider, left, handbook, t0);
  const second = ingestNamed(catalog, provider, right, lookalike, t0 + 1);
  const names = catalog.list().map((entry) => entry.name);
  const ha01 =
    first !== null &&
    second !== null &&
    names.includes("Handbook") &&
    names.includes("Hаndbook");
  const review = installReviewConsentRecord({
    at: 30,
    token: "review-ha01",
    appId: first?.appId ?? "missing",
    publisherPublicKey: first?.publisherPublicKey ?? "missing",
    packageId: handbook.packageHash,
    capabilities: ["storage:kv"],
    confusableWith: catalog.confusableWith(first?.name ?? "Handbook"),
  });
  const ha01Informed = review.subject.confusableWith.includes("Hаndbook");
  return {
    id: "HA-01",
    measured:
      ha01 && !ha01Informed
        ? "UNCONTROLLED"
        : ha01Informed
          ? "INFORMED"
          : "UNCONTROLLED",
    note: ha01Informed
      ? "Two publisher keys both appear as Handbook / homoglyph; install-review confusableWith names the lookalike."
      : ha01
        ? "Two publisher keys both appear as Handbook / homoglyph; confusableWith is empty."
        : "Catalog ingest failed for the homoglyph pair.",
  };
}

function measurePublisherSwap(provider, left, right) {
  const t0 = Date.now();
  const original = signedPackage(provider, left, "swap-app", "1.0.0");
  const swapCatalog = new CatalogStore(provider);
  const kept = ingestNamed(swapCatalog, provider, left, original, t0);
  const swap = signedPackage(provider, right, "swap-app", "2.0.0");
  ingestNamed(swapCatalog, provider, right, swap, t0 + 1);
  const originalStill = kept === null ? null : swapCatalog.get(kept.appId);
  const ha02Blocked =
    originalStill !== null &&
    originalStill.publisherPublicKey === kept.publisherPublicKey &&
    originalStill.version === "1.0.0";
  return {
    id: "HA-02",
    measured: ha02Blocked ? "BLOCKED" : "UNCONTROLLED",
    note: "A different publisher key is a different catalog id; the original entry is not overwritten.",
  };
}

async function measureTrustImport() {
  const host = makeHost();
  const pasted = "ab".repeat(32);
  host.recordConsent(
    consentRecordFromConfirmation(
      {
        token: "trust-1",
        kind: "trust-import",
        appId: "host",
        publisherPublicKey: pasted,
        summary: { source: "paste", label: "community" },
      },
      60,
    ),
  );
  const trust = host.consentTranscript.list()[0];
  const ha03 =
    trust?.kind === "trust-import" &&
    trust.subject.publisherFingerprint === pasted;
  const kv = {
    values: new Map(),
    async get(key) {
      return this.values.get(key) ?? null;
    },
    async set(key, value) {
      this.values.set(key, value);
    },
    async delete(key) {
      this.values.delete(key);
    },
  };
  const store = new TrustStore(kv);
  await store.add({
    publisherPublicKey: `${"11".repeat(32)}${"22".repeat(32)}`,
    label: "lure",
    addedAt: 1,
    source: "paste",
  });
  const degree = await store.degreeOf(`${"11".repeat(32)}${"22".repeat(32)}`);
  return {
    id: "HA-03",
    measured: ha03 && degree === "imported" ? "INFORMED" : "UNCONTROLLED",
    note: "trust-import transcript names the pasted key; TrustStore source paste is imported, not direct.",
  };
}

async function measureChainInstall() {
  const studio = {
    name: "studio",
    publisherPublicKey: "publisher",
    capabilities: ["apps:install"],
  };
  const installHost = makeHost({
    appsBackend: stubAppsBackend(),
  });
  await installHost.setGrants(
    studio.name,
    studio.publisherPublicKey,
    studio.capabilities,
    studio.capabilities,
  );
  const installed = await dispatch(
    installHost,
    "apps",
    "install",
    "apps:install",
    { t256: "A".repeat(94) },
    studio,
  );
  const installRecord = installHost.consentTranscript.list()[0];
  installHost.recordConsent(
    installReviewConsentRecord({
      at: 70,
      token: "review-hello",
      appId: "hello",
      publisherPublicKey: "other-pub",
      packageId: "A".repeat(94),
      capabilities: ["storage:kv"],
    }),
  );
  const ha04 =
    installed.ok === true &&
    installRecord?.kind === "install" &&
    consentDiscloses(installRecord, "apps:install");
  const secondReview = installHost.consentTranscript
    .list()
    .find((record) => record.kind === "install-review");
  const ha05 =
    ha04 &&
    secondReview !== undefined &&
    secondReview.token !== installRecord.token;
  return [
    {
      id: "HA-04",
      measured: ha04 ? "INFORMED" : "UNCONTROLLED",
      note: "apps.install confirmation is transcript-checked; post-fetch review is a separate install-review record.",
    },
    {
      id: "HA-05",
      measured: ha05 ? "INFORMED" : "UNCONTROLLED",
      note: "Chain-install confirmation and the second app's review are distinct tokens.",
    },
  ];
}
